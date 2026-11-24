# 就活サポートシステム(模擬新人研修・チーム開発MVP)

専門学校生の日々の就職活動と、担任教員の進捗管理を支えるWebアプリ。
**SQLite + Python/FastAPI + Jinja2/HTML**構成・完全無料・ローカルで動く。

## セットアップ(各自・10分)

```bash
# 1. プロジェクトフォルダに移動
cd shukatsu-support

# 2. 仮想環境を作る(初回だけ)
py -m venv .venv

# 3. 有効化
# Windows (コマンドプロンプト):
.venv\Scripts\activate
# Windows (Git Bash):
source .venv/Scripts/activate

# 4. 依存をインストール(初回だけ)
pip install -r requirements.txt

# 5. (統括担当だけ)ダミーデータ投入
py seed.py

# 6. 起動
uvicorn main:app --reload
```

ブラウザで http://localhost:8000 を開く。

## AI面接アドバイス(ChatGPT)を使う場合(任意)

```bash
# Windows(コマンドプロンプト)
copy .env.example .env
# Git Bash / macOS
cp .env.example .env

# .env を開いて OPENAI_API_KEY=sk-... を設定する
```

- APIキーは https://platform.openai.com/api-keys で取得
- 使用モデルは `.env` の `OPENAI_MODEL` で変更可能(既定: `gpt-4o-mini`)
- **API利用料がかかります**。学生の選考メモ・指導メモがOpenAI APIに送信されるため、取扱いに注意
- APIキー未設定でも、他の機能はこれまでどおり動作します(`.env` はGitにコミットされません)

| URL | 機能 |
|---|---|
| `/` | トップ |
| `/req01` | REQ-01【学生】志望企業登録・状況更新 |
| `/req02` | REQ-02【学生】選考メモ・振り返り記録 |
| `/req03` | REQ-03【教員】進捗ダッシュボード |
| `/req03/companies` | REQ-03【教員】企業別の応募状況 |
| `/req03/export.csv` | REQ-03【教員】表示中の学生をCSV出力 |
| `/req04/{学生ID}` | REQ-04【教員】学生詳細・指導記録(ダッシュボードの名前リンクから) |

デモの手順は `docs/demo-script.md` を参照。

## 構成

```
shukatsu-support/
├── main.py                      # アプリ本体(各担当のrouterを束ねる)
├── db.py                        # ★共通データ定義(テーブル・ステータス文字列)
├── seed.py                      # ダミーデータ投入(統括担当)
├── templates.py                 # テンプレート共通設定
├── teacher_logic.py             # 教員側の活動状況・停滞判定(REQ-03/04共通)
├── ai_advice.py                 # ChatGPT(OpenAI API)による面接アドバイス生成
├── routers/                     # 機能ごとに1ファイル(縦割り=画面+APIを同じ人)
│   ├── req01_companies.py       # 担当A
│   ├── req02_memos.py           # 担当B
│   ├── req03_dashboard.py       # 担当C
│   └── req04_student_detail.py  # 担当D
├── templates/                   # 画面(base.htmlを継承して使う)
├── static/style.css
└── docs/
    ├── common-definitions.md    # ★第1フェーズで全員が貼る共通定義
    ├── demo-script.md           # 発表会用デモ台本(教員側)
    └── tasks.md                 # 進め方・役割・デモ台本
```

## チーム開発の3鉄則(スライド「開発の注意点」より)

1. **機能縦割り**: 1つの機能の「画面+API」を同じ担当者が同じAIチャットでセット生成する
2. **共通データ定義を最初に固定**: `db.py`のステータス文字列(検討中/応募済み/…/内定)を全員共有。各自のAIプロンプトには必ず`docs/common-definitions.md`の中身を貼る
3. **AIへの指示は小分けに**: 資料を丸投げしない。「テーブル定義だけ」「自分の担当画面だけ」と必要な情報だけ渡す

## 発表会で盛り込む4項目

1. システム概要と実機デモ
2. 人間開発 vs 生成AI開発の比較
3. 今後のAI開発に向けた改善点
4. AI開発での課題と所感
