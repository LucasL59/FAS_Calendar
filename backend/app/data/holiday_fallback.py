"""台灣國定假日後援資料 (2024-2027)
若外部資料來源無法取得時使用"""

from __future__ import annotations

from datetime import date
from typing import List, TypedDict


class HolidayDef(TypedDict):
    subject: str
    date: date


HOLIDAY_DEFINITIONS: List[HolidayDef] = [
    # 2024
    {"subject": "元旦", "date": date(2024, 1, 1)},
    {"subject": "除夕", "date": date(2024, 2, 8)},
    {"subject": "春節假期", "date": date(2024, 2, 9)},
    {"subject": "春節", "date": date(2024, 2, 10)},
    {"subject": "春節假期", "date": date(2024, 2, 12)},
    {"subject": "春節假期", "date": date(2024, 2, 13)},
    {"subject": "春節補假", "date": date(2024, 2, 14)},
    {"subject": "和平紀念日", "date": date(2024, 2, 28)},
    {"subject": "兒童節", "date": date(2024, 4, 4)},
    {"subject": "清明節", "date": date(2024, 4, 5)},
    {"subject": "端午節", "date": date(2024, 6, 10)},
    {"subject": "中秋節", "date": date(2024, 9, 17)},
    {"subject": "國慶日", "date": date(2024, 10, 10)},
    # 2025
    {"subject": "元旦", "date": date(2025, 1, 1)},
    {"subject": "除夕", "date": date(2025, 1, 29)},
    {"subject": "春節假期", "date": date(2025, 1, 30)},
    {"subject": "春節", "date": date(2025, 1, 31)},
    {"subject": "春節假期", "date": date(2025, 2, 1)},
    {"subject": "春節補假", "date": date(2025, 2, 3)},
    {"subject": "和平紀念日", "date": date(2025, 2, 28)},
    {"subject": "兒童節", "date": date(2025, 4, 4)},
    {"subject": "清明節", "date": date(2025, 4, 5)},
    {"subject": "端午節", "date": date(2025, 6, 2)},
    {"subject": "中秋節", "date": date(2025, 9, 18)},
    {"subject": "國慶日", "date": date(2025, 10, 10)},
    # 2026
    {"subject": "元旦", "date": date(2026, 1, 1)},
    {"subject": "除夕", "date": date(2026, 2, 16)},
    {"subject": "春節假期", "date": date(2026, 2, 17)},
    {"subject": "春節", "date": date(2026, 2, 18)},
    {"subject": "春節假期", "date": date(2026, 2, 19)},
    {"subject": "春節補假", "date": date(2026, 2, 20)},
    {"subject": "和平紀念日", "date": date(2026, 2, 28)},
    {"subject": "兒童節", "date": date(2026, 4, 4)},
    {"subject": "清明節", "date": date(2026, 4, 5)},
    {"subject": "端午節", "date": date(2026, 6, 19)},
    {"subject": "中秋節", "date": date(2026, 9, 25)},
    {"subject": "國慶日", "date": date(2026, 10, 10)},
    # 2027
    {"subject": "元旦", "date": date(2027, 1, 1)},
    {"subject": "除夕", "date": date(2027, 2, 5)},
    {"subject": "春節假期", "date": date(2027, 2, 6)},
    {"subject": "春節", "date": date(2027, 2, 7)},
    {"subject": "春節假期", "date": date(2027, 2, 8)},
    {"subject": "春節補假", "date": date(2027, 2, 9)},
    {"subject": "和平紀念日", "date": date(2027, 2, 28)},
    {"subject": "兒童節", "date": date(2027, 4, 4)},
    {"subject": "清明節", "date": date(2027, 4, 5)},
    {"subject": "端午節", "date": date(2027, 6, 9)},
    {"subject": "中秋節", "date": date(2027, 9, 15)},
    {"subject": "國慶日", "date": date(2027, 10, 10)},
]
