# 教員側(REQ-03 / REQ-04)で共通に使う判定ロジック
# ★ STALE_DAYS(停滞判定の日数)を変えるときはチームに周知すること。
from datetime import datetime

STALE_DAYS = 14  # 最終更新からこの日数以上で「要フォロー」

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def parse_datetime(value: str | None) -> datetime | None:
    """DBの created_at 文字列を datetime に変換する(空文字・不正値は None)"""
    if not value:
        return None
    try:
        return datetime.strptime(value, DATETIME_FORMAT)
    except ValueError:
        return None


def days_since(value: str | None, now: datetime | None = None) -> int | None:
    """最終更新からの経過日数(未来日付は0日に丸める)"""
    updated = parse_datetime(value)
    if updated is None:
        return None
    now = now or datetime.now()
    return max((now - updated).days, 0)


def judge_activity(
    applied_count: int,
    offer_count: int,
    active_count: int,
    last_update: str | None,
    now: datetime | None = None,
) -> tuple[str, str | None]:
    """学生の活動状況を判定して (活動状況, 判定理由) を返す

    未活動   : 応募企業が0件
    内定あり : 内定が1件以上
    要フォロー: 内定なし & 最終更新なし or STALE_DAYS日以上更新なし
    活動中   : それ以外
    """
    if applied_count == 0:
        return "未活動", "応募企業が登録されていません"
    if offer_count > 0:
        return "内定あり", None

    days = days_since(last_update, now)

    # 検討中・お見送りだけで、選考中の企業がない場合
    if active_count == 0:
        if days is None:
            return "要フォロー", "選考に進んだ記録がありません"
        if days >= STALE_DAYS:
            return "要フォロー", f"最終更新から{days}日経過"
        return "活動中", None

    # 選考中の企業がある場合
    if days is None:
        return "活動中", "選考メモが未記録です"
    if days >= STALE_DAYS:
        return "要フォロー", f"最終更新から{days}日経過"
    return "活動中", f"最終更新から{days}日"
