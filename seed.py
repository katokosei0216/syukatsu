# 初期ダミーデータ生成(任意機能 / 統括担当が実行する)
# 使い方:  py seed.py
#
# デモで「要フォロー」「未活動」「内定」「直近7日の予定」が必ず見えるように、
# 一部の学生のデータを意図的に作っている。
import random
from datetime import date, datetime, timedelta

from db import GUIDANCE_CATEGORIES, STATUS_OPTIONS, get_conn, init_db

FIRST_NAMES = ["田中", "佐藤", "鈴木", "高橋", "伊藤", "渡辺", "山本", "中村",
               "小林", "加藤", "吉田", "山田", "佐々木", "山口", "松本"]
COMPANIES = ["日立製作所", "富士通", "NTTデータ", "野村総研", "楽天",
             "LINEヤフー", "DeNA", "ソフトバンク", "伊藤忠", "リクルート",
             "サイバーエージェント", "みずほ銀行", "東京ガス", "全日空", "資生堂"]
JOB_TYPES = ["SE", "Webエンジニア", "営業", "企画", "総務", "コンサルタント"]

random.seed(42)  # 毎回同じダミーデータになるように固定

# デモ用の固定シナリオ
STALE_INDEXES = {3, 8}   # 20日以上動きがない「要フォロー」の学生
NO_ACTIVITY_INDEX = 14   # 応募0社の「未活動」の学生
OFFER_INDEX = 0          # 内定ありの学生

GUIDANCE_MEMOS = [
    "履歴書の自己PRが抽象的。具体エピソードを1つに絞って書き直すよう指導。",
    "面接で志望動機が浅い。企業研究のメモを追加してから再面談。",
    "ESの結論が後半にある。PREP法で最初に結論を書くよう指導。",
    "一次面接の反省を踏まえ、逆質問を3つ準備するよう伝えた。",
]


def _days_ago(days: int, hour: int = 10) -> str:
    dt = datetime.now() - timedelta(days=days)
    return dt.replace(hour=hour, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M:%S")


def _future(days: int) -> str:
    return (date.today() + timedelta(days=days)).strftime("%Y-%m-%d")


def main() -> None:
    init_db()
    conn = get_conn()
    try:
        cur = conn.execute("SELECT COUNT(*) FROM students")
        if cur.fetchone()[0] > 0:
            print("データが既に存在するため何もしません(再生成したい場合は app.db を削除)")
            return

        for i, name in enumerate(FIRST_NAMES):
            cur = conn.execute("INSERT INTO students(name) VALUES (?)", (f"{name}{i + 1:02d}",))
            student_id = cur.lastrowid

            if i == NO_ACTIVITY_INDEX:
                n = 0
            else:
                n = random.choice([1, 2, 3, 3, 4])
            if i in STALE_INDEXES:
                n = max(n, 2)

            for j in range(n):
                if i == OFFER_INDEX and j == 0:
                    status = "内定"
                elif i in STALE_INDEXES:
                    # 要フォローの学生は内定を取らせない
                    status = random.choice(["応募済み", "書類選考", "一次面接", "お見送り"])
                else:
                    status = random.choice([
                        s for s in STATUS_OPTIONS if s not in ("内定", "お見送り")
                    ])
                    roll = random.random()
                    if roll < 0.12:
                        status = "内定"
                    elif roll < 0.22:
                        status = "お見送り"

                cur = conn.execute(
                    "INSERT INTO companies(student_id, company_name, job_type, status) VALUES (?,?,?,?)",
                    (student_id, random.choice(COMPANIES), random.choice(JOB_TYPES), status),
                )
                company_id = cur.lastrowid

                make_memo = i in STALE_INDEXES or i == OFFER_INDEX or random.random() < 0.7
                if not make_memo:
                    continue

                if i in STALE_INDEXES:
                    created_at = _days_ago(random.randint(20, 35))
                    next_date = _future(random.choice([1, 2, 3]))
                elif i == OFFER_INDEX:
                    created_at = _days_ago(random.randint(0, 5))
                    next_date = _future(1) if j == 0 else ""
                else:
                    created_at = _days_ago(random.randint(0, 9))
                    next_date = _future(random.choice([1, 2, 3, 5, 7])) if random.random() < 0.5 else ""

                conn.execute(
                    """
                    INSERT INTO selection_memos(company_id, next_selection_date, memo, created_at)
                    VALUES (?,?,?,?)
                    """,
                    (
                        company_id,
                        next_date,
                        "面接で志望動機を聞かれた。事例を増やして話す練習をする。",
                        created_at,
                    ),
                )

            # 指導メモ(カテゴリ・次回指導日つき)
            if i % 5 == 0 or i in STALE_INDEXES:
                conn.execute(
                    """
                    INSERT INTO guidance_memos(student_id, category, memo, next_guidance_date)
                    VALUES (?,?,?,?)
                    """,
                    (
                        student_id,
                        random.choice(GUIDANCE_CATEGORIES),
                        random.choice(GUIDANCE_MEMOS),
                        _future(random.choice([1, 3, 5])) if i in STALE_INDEXES else "",
                    ),
                )

        conn.commit()
        print(f"{len(FIRST_NAMES)}名分のダミーデータを投入しました")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
