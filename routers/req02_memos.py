# REQ-02【学生向け】選考メモ・振り返り記録
# 担当B専用: 画面+APIをすべてこのファイルで完結させる
from fastapi import APIRouter, Form, Query, Request
from fastapi.responses import RedirectResponse

from db import get_conn
from templates import templates

router = APIRouter()


@router.get("/req02")
def page(request: Request, student_id: int = 1, company_id: int | None = Query(None)):
    conn = get_conn()
    try:
        students = conn.execute("SELECT * FROM students ORDER BY id").fetchall()
        companies = conn.execute(
            "SELECT * FROM companies WHERE student_id = ? ORDER BY id DESC",
            (student_id,),
        ).fetchall()
        memos = None
        selected = None
        if company_id:
            selected = conn.execute("SELECT * FROM companies WHERE id = ?", (company_id,)).fetchone()
            memos = conn.execute(
                "SELECT * FROM selection_memos WHERE company_id = ? ORDER BY id DESC",
                (company_id,),
            ).fetchall()
    finally:
        conn.close()
    return templates.TemplateResponse(request=request, name="req02_memos.html", context={
        "students": students,
        "student_id": student_id,
        "companies": companies,
        "selected": selected,
        "memos": memos,
    })


@router.post("/req02/memos")
def add_memo(
    student_id: int = Form(...),
    company_id: int = Form(...),
    next_selection_date: str = Form(""),
    memo: str = Form(""),
):
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO selection_memos(company_id, next_selection_date, memo) VALUES (?,?,?,?)",
            (company_id, next_selection_date, memo),
        )
        conn.commit()
    finally:
        conn.close()
    return RedirectResponse(f"/req02?student_id={student_id}&company_id={company_id}", status_code=303)
