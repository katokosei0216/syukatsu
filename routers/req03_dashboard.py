# REQ-03【教員向け】進捗ダッシュボード
# 担当C専用: 画面+APIをすべてこのファイルで完結させる
import csv
import io
from datetime import datetime

from fastapi import APIRouter, Query, Request
from fastapi.responses import Response

from db import (
    ACTIVE_STATUSES,
    OFFER_STATUS,
    REJECTED_STATUS,
    STATUS_OPTIONS,
    get_conn,
)
from teacher_logic import STALE_DAYS, days_since, judge_activity
from templates import templates

router = APIRouter()

# 面接系ステータスは共通定義から導出する(文字列を直接書かない)
INTERVIEW_STATUSES = [s for s in STATUS_OPTIONS if "面接" in s]

FILTERS = [
    ("all", "すべて"),
    ("stale", "要フォロー"),
    ("active", "活動中"),
    ("offer", "内定あり"),
    ("none", "未活動"),
]
FILTER_KEYS = {key for key, _ in FILTERS}
FILTER_ACTIVITY = {
    "stale": "要フォロー",
    "active": "活動中",
    "offer": "内定あり",
    "none": "未活動",
}


def _fetch_students(conn):
    """学生ごとの応募数・選考中数・内定数・最終更新をまとめて取得する"""
    active_marks = ",".join("?" * len(ACTIVE_STATUSES))
    interview_marks = ",".join("?" * len(INTERVIEW_STATUSES))
    rows = conn.execute(
        f"""
        SELECT s.id, s.name,
               COUNT(c.id) AS applied_count,
               COALESCE(SUM(CASE WHEN c.status = ? THEN 1 ELSE 0 END), 0) AS offer_count,
               COALESCE(SUM(CASE WHEN c.status IN ({active_marks}) THEN 1 ELSE 0 END), 0) AS active_count,
               COALESCE(SUM(CASE WHEN c.status IN ({interview_marks}) THEN 1 ELSE 0 END), 0) AS interview_count,
               (
                   SELECT MAX(m.created_at)
                   FROM selection_memos m
                   JOIN companies c2 ON c2.id = m.company_id
                   WHERE c2.student_id = s.id
               ) AS last_update
        FROM students s
        LEFT JOIN companies c ON c.student_id = s.id
        GROUP BY s.id, s.name
        ORDER BY s.id
        """,
        [OFFER_STATUS, *ACTIVE_STATUSES, *INTERVIEW_STATUSES],
    ).fetchall()
    return rows


def _build_students(conn, now: datetime) -> list[dict]:
    """学生一覧に活動状況・理由・経過日数を付けて返す"""
    students = []
    for r in _fetch_students(conn):
        activity, reason = judge_activity(
            r["applied_count"], r["offer_count"], r["active_count"], r["last_update"], now
        )
        students.append({
            **dict(r),
            "activity": activity,
            "reason": reason,
            "days_since": days_since(r["last_update"], now),
        })
    return students


def _select_students(students: list[dict], activity_filter: str, keyword: str) -> list[dict]:
    """画面・CSV共通の絞り込み"""
    return [
        s for s in students
        if (not keyword or keyword in s["name"])
        and (activity_filter == "all" or s["activity"] == FILTER_ACTIVITY.get(activity_filter))
    ]


def _class_stats(students: list[dict]) -> dict:
    stats = {"total": len(students), "offer": 0, "active": 0, "stale": 0, "none": 0}
    stat_keys = {"内定あり": "offer", "活動中": "active", "要フォロー": "stale", "未活動": "none"}
    for s in students:
        stats[stat_keys[s["activity"]]] += 1
    return stats


def _fetch_status_bars(conn):
    """選考ステータス別の企業数(グラフ用)"""
    rows = conn.execute(
        "SELECT status, COUNT(*) AS cnt FROM companies GROUP BY status"
    ).fetchall()
    counts = {s: 0 for s in STATUS_OPTIONS}
    for r in rows:
        if r["status"] in counts:
            counts[r["status"]] = r["cnt"]
    max_count = max(counts.values(), default=0)
    total = sum(counts.values())
    bars = [
        {
            "label": s,
            "count": counts[s],
            "percent": round(counts[s] * 100 / max_count, 1) if max_count else 0,
        }
        for s in STATUS_OPTIONS
    ]
    return total, bars


def _fetch_company_stats(conn, keyword: str):
    """企業ごとの応募者数・面接中・内定・お見送りを集計する"""
    active_marks = ",".join("?" * len(ACTIVE_STATUSES))
    interview_marks = ",".join("?" * len(INTERVIEW_STATUSES))
    params = [OFFER_STATUS, *ACTIVE_STATUSES, *INTERVIEW_STATUSES, REJECTED_STATUS]
    where = ""
    if keyword:
        where = "WHERE company_name LIKE ?"
        params.append(f"%{keyword}%")

    return conn.execute(
        f"""
        SELECT company_name,
               COUNT(*) AS application_count,
               COUNT(DISTINCT student_id) AS student_count,
               SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS offer_count,
               SUM(CASE WHEN status IN ({active_marks}) THEN 1 ELSE 0 END) AS active_count,
               SUM(CASE WHEN status IN ({interview_marks}) THEN 1 ELSE 0 END) AS interview_count,
               SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS rejected_count
        FROM companies
        {where}
        GROUP BY company_name
        ORDER BY application_count DESC, company_name
        """,
        params,
    ).fetchall()


def _fetch_company_applicants(conn, company_name: str):
    """指定企業に応募している学生の一覧"""
    return conn.execute(
        """
        SELECT c.id, c.job_type, c.status,
               s.id AS student_id, s.name AS student_name,
               (
                   SELECT MAX(m.created_at)
                   FROM selection_memos m
                   WHERE m.company_id = c.id
               ) AS last_update
        FROM companies c
        JOIN students s ON s.id = c.student_id
        WHERE c.company_name = ?
        ORDER BY s.id
        """,
        (company_name,),
    ).fetchall()


def _fetch_upcoming(conn):
    """直近7日以内の面接・締切・指導予定をまとめて返す"""
    events = []
    for r in conn.execute(
        """
        SELECT s.id AS student_id, s.name AS student_name,
               c.company_name, m.next_selection_date
        FROM selection_memos m
        JOIN companies c ON c.id = m.company_id
        JOIN students s ON s.id = c.student_id
        WHERE m.id = (
                  SELECT MAX(m2.id) FROM selection_memos m2
                  WHERE m2.company_id = m.company_id
              )
          AND m.next_selection_date <> ''
          AND m.next_selection_date >= date('now', 'localtime')
          AND m.next_selection_date <= date('now', 'localtime', '+7 day')
        ORDER BY m.next_selection_date, s.id
        """
    ):
        events.append({
            "date": r["next_selection_date"],
            "student_id": r["student_id"],
            "student_name": r["student_name"],
            "type": "面接・締切",
            "label": r["company_name"],
        })

    for r in conn.execute(
        """
        SELECT g.student_id, s.name AS student_name,
               g.category, g.next_guidance_date
        FROM guidance_memos g
        JOIN students s ON s.id = g.student_id
        WHERE g.next_guidance_date <> ''
          AND g.next_guidance_date >= date('now', 'localtime')
          AND g.next_guidance_date <= date('now', 'localtime', '+7 day')
        ORDER BY g.next_guidance_date, g.student_id
        """
    ):
        events.append({
            "date": r["next_guidance_date"],
            "student_id": r["student_id"],
            "student_name": r["student_name"],
            "type": "指導",
            "label": f"{r['category']}の指導",
        })

    events.sort(key=lambda e: (e["date"], e["student_id"]))
    return events


def _normalize_filter(value: str) -> str:
    return value if value in FILTER_KEYS else "all"


@router.get("/req03")
def page(
    request: Request,
    activity_filter: str = Query("all", alias="filter"),
    q: str = Query(""),
):
    now = datetime.now()
    keyword = q.strip()
    activity_filter = _normalize_filter(activity_filter)

    conn = get_conn()
    try:
        all_students = _build_students(conn, now)
        status_total, status_bars = _fetch_status_bars(conn)
        upcoming = _fetch_upcoming(conn)
    finally:
        conn.close()

    stats = _class_stats(all_students)
    alerts = sorted(
        [s for s in all_students if s["activity"] == "要フォロー"],
        key=lambda s: (s["days_since"] is None, -(s["days_since"] or 0)),
    )
    students = _select_students(all_students, activity_filter, keyword)

    return templates.TemplateResponse(request=request, name="req03_dashboard.html", context={
        "students": students,
        "stats": stats,
        "alerts": alerts,
        "upcoming": upcoming,
        "filters": FILTERS,
        "current_filter": activity_filter,
        "q": keyword,
        "stale_days": STALE_DAYS,
        "status_total": status_total,
        "status_bars": status_bars,
    })


@router.get("/req03/companies")
def companies_page(
    request: Request,
    q: str = Query(""),
    company: str = Query(""),
):
    keyword = q.strip()
    selected_name = company.strip()

    conn = get_conn()
    try:
        companies = _fetch_company_stats(conn, keyword)
        applicants = _fetch_company_applicants(conn, selected_name) if selected_name else []
    finally:
        conn.close()

    stats = {
        "companies": len(companies),
        "applications": sum(r["application_count"] for r in companies),
        "offers": sum(r["offer_count"] for r in companies),
    }

    return templates.TemplateResponse(request=request, name="req03_companies.html", context={
        "companies": companies,
        "stats": stats,
        "q": keyword,
        "selected_name": selected_name if applicants else None,
        "applicants": applicants,
        "unknown_company": selected_name if selected_name and not applicants else None,
    })


def _csv_cell(value) -> str:
    """Excelの数式インジェクション対策(先頭の = + - @ を無効化)"""
    text = "" if value is None else str(value)
    if text[:1] in ("=", "+", "-", "@"):
        return "'" + text
    return text


@router.get("/req03/export.csv")
def export_csv(
    activity_filter: str = Query("stale", alias="filter"),
    q: str = Query(""),
):
    """表示中の学生をCSVで出力する(既定は要フォロー)"""
    now = datetime.now()
    activity_filter = _normalize_filter(activity_filter)

    conn = get_conn()
    try:
        all_students = _build_students(conn, now)
    finally:
        conn.close()

    students = _select_students(all_students, activity_filter, q.strip())

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "学生名", "活動状況", "判定理由", "応募社数", "選考中", "面接中",
        "内定社数", "最終更新", "経過日数",
    ])
    for s in students:
        writer.writerow([
            _csv_cell(s["name"]),
            _csv_cell(s["activity"]),
            _csv_cell(s["reason"]),
            s["applied_count"],
            s["active_count"],
            s["interview_count"],
            s["offer_count"],
            _csv_cell(s["last_update"]),
            "" if s["days_since"] is None else s["days_since"],
        ])

    filename = f"students_{activity_filter}_{now:%Y%m%d}.csv"
    return Response(
        content="\ufeff" + buf.getvalue(),  # BOM付きでExcelの文字化けを防ぐ
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
