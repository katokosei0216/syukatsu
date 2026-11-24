# ===== ChatGPT(OpenAI API)による面接アドバイス生成 =====
# APIキーは .env の OPENAI_API_KEY から読む(Gitにはコミットしない)
import os

from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = "gpt-4o-mini"
MAX_MEMOS = 10
MAX_GUIDANCE_MEMOS = 5
MAX_MEMO_CHARS = 4000

SYSTEM_PROMPT = """あなたは専門学校の就職支援を担当する経験豊富な教員です。
学生の選考メモを読み、次の選考に向けた実践的なアドバイスを日本語で作成します。
- 学生を責めず、前向きで具体的な表現にする
- メモに書かれていない事実を断定しない
- 面接の段階(一次・二次・最終)に応じて、想定される質問や評価観点を変える
- 面接官の意図や企業研究の視点も必要に応じて添える
- 教員が学生にそのまま渡せる、です・ます調の文章にする"""


class AIAdviceError(Exception):
    """画面にそのまま表示してよいエラー"""


def is_configured() -> bool:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    return bool(key) and key != "sk-your-api-key-here"


def _memo_text(memos, limit: int) -> str:
    """メモをプロンプト用の箇条書きにする(件数・文字数に上限)"""
    lines = []
    total = 0
    for m in list(memos)[:limit]:
        text = (m.get("memo") or "").strip()
        if not text:
            continue
        date = (m.get("created_at") or "").strip()
        line = f"- {date} {text}" if date else f"- {text}"
        if m.get("next_selection_date"):
            line += f" (次回選考日: {m['next_selection_date']})"
        if total + len(line) > MAX_MEMO_CHARS:
            break
        lines.append(line)
        total += len(line)
    return "\n".join(lines)


def build_messages(
    student_name: str,
    company_name: str,
    job_type: str,
    status: str,
    memos,
    guidance_memos=(),
):
    memo_text = _memo_text(memos, MAX_MEMOS) or "(選考メモなし)"
    guidance_text = _memo_text(guidance_memos, MAX_GUIDANCE_MEMOS) or "(なし)"

    user_prompt = f"""以下の学生の選考について、次に備えたアドバイスを作成してください。

【学生】{student_name}
【企業】{company_name}
【志望職種】{job_type or "不明"}
【現在のステータス】{status}

【選考メモ(新しい順)】
{memo_text}

【教員の指導メモ(新しい順)】
{guidance_text}

次の3つの見出しで、400〜600字程度にまとめてください。各見出しは箇条書き3つ以内です。
1. うまくいっている点
2. 改善ポイント
3. 次回までの具体的な行動(3つ)

「3」は明日から実行できる粒度にし、次回面接で試せる回答例を1つ含めてください。
メモに書かれていない内容は推測で補わず、「メモからは分からない」と書いてください。"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def generate_advice(
    *,
    student_name: str,
    company_name: str,
    job_type: str,
    status: str,
    memos,
    guidance_memos=(),
) -> str:
    if not is_configured():
        raise AIAdviceError(
            "OPENAI_API_KEY が設定されていません。"
            "プロジェクト直下の .env にAPIキーを設定してください。"
        )

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise AIAdviceError(
            "openai パッケージが入っていません。"
            "pip install -r requirements.txt を実行してください。"
        ) from exc

    try:
        client = OpenAI(timeout=30.0)
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", DEFAULT_MODEL),
            messages=build_messages(
                student_name, company_name, job_type, status, memos, guidance_memos
            ),
            temperature=0.7,
            max_tokens=800,
        )
    except Exception as exc:
        hints = {
            "AuthenticationError": "APIキーが正しくない可能性があります。",
            "PermissionDeniedError": "APIキーの権限が不足しています。",
            "RateLimitError": "APIの利用上限に達した可能性があります。時間をおいて再試行してください。",
            "NotFoundError": "指定したモデルが利用できません。.env の OPENAI_MODEL を確認してください。",
            "BadRequestError": "リクエストが拒否されました。設定を確認してください。",
            "APIConnectionError": "ネットワークに接続できませんでした。",
            "APITimeoutError": "APIの応答がタイムアウトしました。",
        }
        hint = hints.get(type(exc).__name__, f"({type(exc).__name__})")
        raise AIAdviceError(f"AIアドバイスの生成に失敗しました。{hint}") from exc

    content = (response.choices[0].message.content or "").strip()
    if not content:
        raise AIAdviceError("AIから空の応答が返りました。もう一度お試しください。")
    return content
