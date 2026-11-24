# ===== 共通データ定義(第1フェーズでチーム全員がこれで固定する) =====
# ★重要: 各自がAIにプロンプトを出すとき、このファイルの中身を必ず貼り付けること。
#   ここを変えるときはチーム全員に周知してから。

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"

# --- 選考ステータス(この文字列を全機能で共通使用する) ---
STATUS_OPTIONS = [
    "検討中",
    "応募済み",
    "書類選考",
    "一次面接",
    "二次面接",
    "最終面接",
    "内定",
    "お見送り",
]

OFFER_STATUS = "内定"  # 内定判定は必ずこの文字列と一致で行う
REJECTED_STATUS = "お見送り"  # 不合格判定は必ずこの文字列と一致で行う
# 「活動中」とみなすステータス(ダッシュボード用)
ACTIVE_STATUSES = ["応募済み", "書類選考", "一次面接", "二次面接", "最終面接"]

# --- 教員の指導メモのカテゴリ(この文字列を全機能で共通使用する) ---
GUIDANCE_CATEGORIES = ["履歴書", "面接", "ES", "その他"]
GUIDANCE_DEFAULT_CATEGORY = "その他"

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER NOT NULL REFERENCES students(id),
    company_name TEXT    NOT NULL,
    job_type     TEXT    NOT NULL DEFAULT '',
    status       TEXT    NOT NULL DEFAULT '検討中'
);

CREATE TABLE IF NOT EXISTS selection_memos (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id           INTEGER NOT NULL REFERENCES companies(id),
    next_selection_date  TEXT    NOT NULL DEFAULT '',
    memo                 TEXT    NOT NULL DEFAULT '',
    created_at           TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guidance_memos (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id         INTEGER NOT NULL REFERENCES students(id),
    category           TEXT    NOT NULL DEFAULT 'その他',
    memo               TEXT    NOT NULL,
    next_guidance_date TEXT    NOT NULL DEFAULT '',
    created_at         TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
"""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    """既存の app.db に後から追加した列を安全に足す(何度実行してもOK)"""
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(guidance_memos)")}
    if "category" not in columns:
        conn.execute(
            "ALTER TABLE guidance_memos ADD COLUMN category TEXT NOT NULL DEFAULT 'その他'"
        )
    if "next_guidance_date" not in columns:
        conn.execute(
            "ALTER TABLE guidance_memos ADD COLUMN next_guidance_date TEXT NOT NULL DEFAULT ''"
        )


def init_db() -> None:
    """起動時にテーブルを確実に作成する(各担当はこれを呼ぶだけでOK)"""
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)
