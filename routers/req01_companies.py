# REQ-01【学生向け】志望企業登録・状況更新
# 担当A専用: この機能の画面+APIはすべてこのファイルで完結させる
from fastapi import APIRouter, Form, Query, Request
from fastapi.responses import RedirectResponse

from db import get_conn, STATUS_OPTIONS
from templates import templates

router = APIRouter()


@router.get("/req01")
def page(request: Request, student_id: int = 1):
    conn = get_conn()
    try:
        students = conn.execute("SELECT * FROM students ORDER BY id").fetchall()
        companies = conn.execute(
            "SELECT * FROM companies WHERE student_id = ? ORDER BY id DESC",
            (student_id,),
        ).fetchall()
    finally:
        conn.close()
    return templates.TemplateResponse(request=request, name="req01_companies.html", context={
        "students": students,
        "student_id": student_id,
        "companies": companies,
        "status_options": STATUS_OPTIONS,
    })


@router.post("/req01/companies")
def add_company(
    student_id: int = Form(...),
    company_name: str = Form(...),
    job_type: str = Form(""),
):
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO companies(student_id, company_name, job_type, status) VALUES (?,?,?,'検討中')",
            (student_id, company_name.strip(), job_type.strip()),
        )
        conn.commit()
    finally:
        conn.close()
    return RedirectResponse(f"/req01?student_id={student_id}", status_code=303)


@router.post("/req01/companies/{company_id}/status")
def update_status(company_id: int, student_id: int = Form(...), status: str = Form(...)):
    conn = get_conn()
    try:
        conn.execute("UPDATE companies SET status = ? WHERE id = ?", (status, company_id))
        conn.commit()
    finally:
        conn.close()
    return RedirectResponse(f"/req01?student_id={student_id}", status_code=303)
