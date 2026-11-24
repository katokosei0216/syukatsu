# REQ-04【教員向け】学生詳細・指導記録
# 担当D専用: 画面+APIをすべてこのファイルで完結させる
from datetime import datetime

from fastapi import APIRouter, Form, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

import ai_advice
from db import (
    ACTIVE_STATUSES,
    GUIDANCE_CATEGORIES,
    GUIDANCE_DEFAULT_CATEGORY,
    OFFER_STATUS,
    get_conn,
)
from teacher_logic import STALE_DAYS, days_since, judge_activity
from templates import templates

router = APIRouter()


def _clean_date(value: str) -> str:
    """YYYY-MM-DD 以外は空文字にする(HTMLのdate入力が主だが保険)"""
    value = value.strip()
    if not value:
        return ""
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return ""
    return value


def _clean_category(value: str) -> str:
    return value if value in GUIDANCE_CATEGORIES else GUIDANCE_DEFAULT_CATEGORY


@router.get("/req04/{student_id}")
def page(
    request: Request,
    student_id: int,
    category_filter: str = Query("all", alias="category"),
):
    conn = get_conn()
    try:
        student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        if student is None:
            raise HTTPException(status_code=404, detail="学生が見つかりません")
        companies = conn.execute(
            "SELECT * FROM companies WHERE student_id = ? ORDER BY id DESC",
            (student_id,),
        ).fetchall()
        memos = conn.execute(
            """
            SELECT m.*, c.company_name
            FROM selection_memos m
            JOIN companies c ON c.id = m.company_id
            WHERE c.student_id = ?
            ORDER BY m.id DESC
            """,
            (student_id,),
        ).fetchall()
        guidance = conn.execute(
            "SELECT * FROM guidance_memos WHERE student_id = ? ORDER BY id DESC",
            (student_id,),
        ).fetchall()
    finally:
        conn.close()

    offer_count = sum(1 for c in companies if c["status"] == OFFER_STATUS)
    active_count = sum(1 for c in companies if c["status"] in ACTIVE_STATUSES)
    last_update = max((m["created_at"] for m in memos), default=None)
    activity, reason = judge_activity(
        len(companies), offer_count, active_count, last_update
    )

    # 次回選考日が今日以降のもの(企業ごとに最新メモ1件だけ)
    today = datetime.now().strftime("%Y-%m-%d")
    upcoming = []
    seen_companies = set()
    for m in memos:
        if m["next_selection_date"] and m["next_selection_date"] >= today and m["company_id"] not in seen_companies:
            seen_companies.add(m["company_id"])
            upcoming.append(m)
    upcoming.sort(key=lambda m: m["next_selection_date"])

    # 次回指導日の予定(今日以降を近い順に)
    next_guidance = sorted(
        [g for g in guidance if g["next_guidance_date"] and g["next_guidance_date"] >= today],
        key=lambda g: g["next_guidance_date"],
    )

    # カテゴリ別の絞り込み
    if category_filter not in GUIDANCE_CATEGORIES:
        category_filter = "all"
    category_counts = {c: 0 for c in GUIDANCE_CATEGORIES}
    for g in guidance:
        if g["category"] in category_counts:
            category_counts[g["category"]] += 1
    guidance_list = (
        guidance if category_filter == "all"
        else [g for g in guidance if g["category"] == category_filter]
    )

    return templates.TemplateResponse(request=request, name="req04_student_detail.html", context={
        "student": student,
        "companies": companies,
        "memos": memos,
        "guidance": guidance,
        "guidance_list": guidance_list,
        "current_category": category_filter,
        "category_counts": category_counts,
        "upcoming": upcoming,
        "next_guidance": next_guidance,
        "today": today,
        "activity": activity,
        "reason": reason,
        "days_since": days_since(last_update),
        "stale_days": STALE_DAYS,
        "applied_count": len(companies),
        "offer_count": offer_count,
        "categories": GUIDANCE_CATEGORIES,
        "default_category": GUIDANCE_DEFAULT_CATEGORY,
        "ai_configured": ai_advice.is_configured(),
    })


@router.post("/req04/{student_id}/guidance")
def add_guidance(
    student_id: int,
    memo: str = Form(...),
    category: str = Form(GUIDANCE_DEFAULT_CATEGORY),
    next_guidance_date: str = Form(""),
):
    memo = memo.strip()
    if not memo:
        return RedirectResponse(f"/req04/{student_id}", status_code=303)
    category = _clean_category(category)
    conn = get_conn()
    try:
        conn.execute(
            """
            INSERT INTO guidance_memos(student_id, category, memo, next_guidance_date)
            VALUES (?,?,?,?)
            """,
            (student_id, category, memo, _clean_date(next_guidance_date)),
        )
        conn.commit()
    finally:
        conn.close()
    return RedirectResponse(f"/req04/{student_id}", status_code=303)


@router.post("/req04/{student_id}/guidance/{guidance_id}/delete")
def delete_guidance(student_id: int, guidance_id: int):
    conn = get_conn()
    try:
        conn.execute(
            "DELETE FROM guidance_memos WHERE id = ? AND student_id = ?",
            (guidance_id, student_id),
        )
        conn.commit()
    finally:
        conn.close()
    return RedirectResponse(f"/req04/{student_id}", status_code=303)


@router.get("/req04/{student_id}/guidance/{guidance_id}/edit")
def edit_guidance_page(request: Request, student_id: int, guidance_id: int):
    conn = get_conn()
    try:
        student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        guidance = conn.execute(
            "SELECT * FROM guidance_memos WHERE id = ? AND student_id = ?",
            (guidance_id, student_id),
        ).fetchone()
    finally:
        conn.close()
    if student is None or guidance is None:
        raise HTTPException(status_code=404, detail="指導メモが見つかりません")
    return templates.TemplateResponse(request=request, name="req04_guidance_edit.html", context={
        "student": student,
        "guidance": guidance,
        "categories": GUIDANCE_CATEGORIES,
        "default_category": GUIDANCE_DEFAULT_CATEGORY,
    })


@router.post("/req04/{student_id}/guidance/{guidance_id}/edit")
def update_guidance(
    student_id: int,
    guidance_id: int,
    memo: str = Form(...),
    category: str = Form(GUIDANCE_DEFAULT_CATEGORY),
    next_guidance_date: str = Form(""),
):
    memo = memo.strip()
    if not memo:
        return RedirectResponse(
            f"/req04/{student_id}/guidance/{guidance_id}/edit", status_code=303
        )
    conn = get_conn()
    try:
        cur = conn.execute(
            """
            UPDATE guidance_memos
               SET category = ?, memo = ?, next_guidance_date = ?
             WHERE id = ? AND student_id = ?
            """,
            (
                _clean_category(category),
                memo,
                _clean_date(next_guidance_date),
                guidance_id,
                student_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="指導メモが見つかりません")
    return RedirectResponse(f"/req04/{student_id}", status_code=303)


@router.post("/req04/{student_id}/ai-advice")
def create_ai_advice(request: Request, student_id: int, company_id: int = Form(...)):
    """選考メモをもとにChatGPTで面接アドバイスを生成する"""
    conn = get_conn()
    try:
        student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        company = conn.execute(
            "SELECT * FROM companies WHERE id = ? AND student_id = ?",
            (company_id, student_id),
        ).fetchone()
        if student is None or company is None:
            raise HTTPException(status_code=404, detail="学生または企業が見つかりません")

        memos = conn.execute(
            "SELECT * FROM selection_memos WHERE company_id = ? ORDER BY id DESC",
            (company_id,),
        ).fetchall()
        guidance = conn.execute(
            "SELECT * FROM guidance_memos WHERE student_id = ? ORDER BY id DESC LIMIT ?",
            (student_id, ai_advice.MAX_GUIDANCE_MEMOS),
        ).fetchall()
    finally:
        conn.close()

    memo_dicts = [dict(m) for m in memos]
    advice = None
    error = None
    if not memo_dicts:
        error = (
            "この企業の選考メモがまだありません。"
            "REQ-02で振り返りを記録してから実行してください。"
        )
    else:
        try:
            advice = ai_advice.generate_advice(
                student_name=student["name"],
                company_name=company["company_name"],
                job_type=company["job_type"],
                status=company["status"],
                memos=memo_dicts,
                guidance_memos=[dict(g) for g in guidance],
            )
        except ai_advice.AIAdviceError as exc:
            error = str(exc)

    return templates.TemplateResponse(request=request, name="req04_ai_advice.html", context={
        "student": student,
        "company": company,
        "memos": memo_dicts,
        "advice": advice,
        "error": error,
    })
