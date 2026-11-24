# 共通データ定義(第1フェーズで全員がこれで固定する)

> ★各自がAIに指示を出すとき、**このファイル全体をそのままプロンプトに貼り付けてから**、
> 自分の担当機能の指示を書くこと。ここを修正したら必ずチームに周知する。

## 選考ステータス(文字列はこのとおり・変更禁止)

`検討中` / `応募済み` / `書類選考` / `一次面接` / `二次面接` / `最終面接` / `内定` / `お見送り`

- 内定判定は必ず文字列 `内定` と一致で行う(OFFER_STATUS)
- お見送り判定は必ず文字列 `お見送り` と一致で行う(REJECTED_STATUS)
- ダッシュボードの「活動中」判定: `応募済み`〜`最終面接` のいずれか(ACTIVE_STATUSES)
- 「未活動」判定: 応募社数 0

## 指導メモのカテゴリ(文字列はこのとおり・変更禁止)

`履歴書` / `面接` / `ES` / `その他`

- 既定値は `その他`(GUIDANCE_DEFAULT_CATEGORY)
- `next_guidance_date` は `YYYY-MM-DD` 形式。未設定は空文字 `''`

## テーブル定義(SQLite)

```sql
students(id, name)
companies(id, student_id → students.id, company_name, job_type, status)
selection_memos(id, company_id → companies.id, next_selection_date, memo, created_at)
guidance_memos(id, student_id → students.id, category, memo, next_guidance_date, created_at)
```

- `next_selection_date` / `next_guidance_date` は `YYYY-MM-DD` 形式の文字列
- `created_at` は `datetime('now','localtime')` 形式(例: `2026-11-17 13:00:00`)
- 既存の `app.db` に `category` / `next_guidance_date` が無い場合は、起動時に `db.py` の `_migrate()` が自動で追加する

## 共通実装ルール

- DB接続は必ず `db.py` の `get_conn()` を使う(row_factory = sqlite3.Row 済み)
- テーブル作成は `db.py` の `init_db()` が全員分まとめて実行する。**各自で CREATE TABLE を書かない**
- 画面テンプレートは `templates/base.html` を継承し、`templates.py` の `templates` を使う
- 更新系フォームは POST → RedirectResponse(status_code=303) の PRG パターン
- キー名は日本語カラムを作らず、上の英スネークケース名だけを使う
