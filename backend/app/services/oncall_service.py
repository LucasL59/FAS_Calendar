"""值班行程服務
負責載入靜態 JSON 並轉換為 CalendarEvent 資料"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, time
from pathlib import Path
from typing import Dict, List, Optional

from loguru import logger

from ..config import Settings, get_settings
from ..models import CalendarEvent, DateTimeInfo, ShowAs, UserInfo


class OnCallService:
    """管理值班行程資料"""

    def __init__(self, settings: Optional[Settings] = None, data_path: Optional[Path] = None) -> None:
        self._settings = settings or get_settings()
        self._data_path = data_path or Path(__file__).resolve().parent.parent / "data" / "oncall_schedule.json"
        self._schedule_cache: Dict[str, List[dict]] = {}
        self._last_mtime: Optional[float] = None

    def _load_schedule(self) -> Dict[str, List[dict]]:
        """載入值班 JSON，並在檔案未變更時使用快取"""
        if not self._data_path.exists():
            logger.warning("值班行程檔案不存在: %s", self._data_path)
            self._schedule_cache = {}
            self._last_mtime = None
            return {}

        mtime = self._data_path.stat().st_mtime
        if self._schedule_cache and self._last_mtime == mtime:
            return self._schedule_cache

        try:
            with self._data_path.open("r", encoding="utf-8") as file:
                raw = json.load(file)
            if not isinstance(raw, dict):
                raise ValueError("值班行程檔案格式應為物件 (月份 -> 清單)")
            self._schedule_cache = raw
            self._last_mtime = mtime
            logger.info("已載入 %d 個月份的值班行程", len(raw))
            return self._schedule_cache
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("載入值班行程失敗: %s", exc)
            self._schedule_cache = {}
            self._last_mtime = mtime
            return {}

    def get_oncall_events(self, year: int, month: int, users: List[UserInfo]) -> List[CalendarEvent]:
        """取得指定年月的值班行程"""
        month_key = f"{year:04d}-{month:02d}"
        schedule = self._load_schedule()
        assignments = schedule.get(month_key, [])
        return self._build_events(month_key, assignments, users)

    def get_all_events(self, users: List[UserInfo]) -> List[CalendarEvent]:
        """取得所有月份的值班行程"""
        schedule = self._load_schedule()
        events: List[CalendarEvent] = []
        for month_key in sorted(schedule.keys()):
            assignments = schedule.get(month_key, [])
            events.extend(self._build_events(month_key, assignments, users))
        return events

    def _build_events(
        self,
        month_key: str,
        assignments: List[dict],
        users: List[UserInfo],
    ) -> List[CalendarEvent]:
        if not assignments:
            return []

        user_map = {user.email.lower(): user for user in users}
        timezone_name = self._settings.timezone
        tzinfo = self._settings.timezone_info
        events: List[CalendarEvent] = []

        for index, assignment in enumerate(assignments):
            user_email = assignment.get("userEmail", "").strip()
            if not user_email:
                logger.warning("略過缺少 userEmail 的值班資料: %s", assignment)
                continue

            start_str = assignment.get("start")
            end_str = assignment.get("end")
            if not start_str or not end_str:
                logger.warning("略過缺少日期的值班資料: %s", assignment)
                continue

            try:
                start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
                end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
            except ValueError:
                logger.warning("值班日期格式錯誤 (需 YYYY-MM-DD): %s", assignment)
                continue

            if end_date < start_date:
                logger.warning("值班結束日早於開始日: %s", assignment)
                continue

            # Graph all-day 結束時間為次日 00:00
            start_dt = datetime.combine(start_date, time.min, tzinfo)
            end_dt = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo)

            user_info = user_map.get(user_email.lower())
            display_name = user_info.display_name if user_info else user_email.split("@")[0]

            event = CalendarEvent(
                id=f"oncall-{month_key}-{index}-{user_email}",
                subject=f"值班｜{display_name}",
                start=DateTimeInfo(date_time=start_dt, time_zone=timezone_name),
                end=DateTimeInfo(date_time=end_dt, time_zone=timezone_name),
                is_all_day=True,
                user_email=user_email,
                user_name=display_name,
                show_as=ShowAs.BUSY,
            )

            events.append(event)

        return events
