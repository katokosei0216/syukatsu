from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from db import init_db
from templates import templates

from routers import req01_companies, req02_memos, req03_dashboard, req04_student_detail

app = FastAPI(title="就活サポートシステム")

init_db()
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(req01_companies.router)
app.include_router(req02_memos.router)
app.include_router(req03_dashboard.router)
app.include_router(req04_student_detail.router)


@app.get("/")
def top(request: Request):
    return templates.TemplateResponse(request=request, name="top.html", context={})
