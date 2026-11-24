# テンプレートの共通設定(全員ここを使う)
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="templates")
