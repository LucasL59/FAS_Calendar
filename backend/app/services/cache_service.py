"""
快取服務
使用記憶體快取儲存行事曆資料，降低 API 呼叫次數
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional

from cachetools import TTLCache
from loguru import logger

from ..config import Settings, get_settings
from ..models import CalendarEvent, UserInfo


class CacheService:
    """快取服務類別"""

    def __init__(self, settings: Optional[Settings] = None):
        """初始化快取服務"""
        self._settings = settings or get_settings()
        self._timezone = self._settings.timezone_info

        # TTL 快取，預設 15 分鐘過期
        cache_ttl = self._settings.cache_duration_minutes * 60
        self._calendar_cache: TTLCache = TTLCache(maxsize=100, ttl=cache_ttl)
        self._user_cache: TTLCache = TTLCache(maxsize=100, ttl=cache_ttl * 4)  # 使用者資訊快取更久

        # 同步狀態
        self._last_sync: Optional[datetime] = None
        self._is_syncing: bool = False
        self._error_message: Optional[str] = None

    def set_calendars(
        self,
        calendars: Dict[str, List[CalendarEvent]],
    ) -> None:
        """
        儲存行事曆資料到快取

        Args:
            calendars: 以信箱為 key 的行事曆事件字典
        """
        for email, events in calendars.items():
            cache_key = f"calendar:{email}"
            self._calendar_cache[cache_key] = events
            logger.debug(f"快取 {email} 的 {len(events)} 個事件")

        self._last_sync = datetime.now(self._timezone)
        logger.info(f"已快取 {len(calendars)} 位使用者的行事曆")

    def get_calendar(self, email: str) -> Optional[List[CalendarEvent]]:
        """
        從快取取得單一使用者的行事曆

        Args:
            email: 使用者信箱

        Returns:
            行事曆事件清單，若快取不存在則回傳 None
        """
        cache_key = f"calendar:{email}"
        return self._calendar_cache.get(cache_key)

    def get_all_calendars(
        self,
        user_emails: List[str],
    ) -> Dict[str, List[CalendarEvent]]:
        """
        從快取取得多位使用者的行事曆

        Args:
            user_emails: 使用者信箱清單

        Returns:
            以信箱為 key 的行事曆事件字典
        """
        calendars: Dict[str, List[CalendarEvent]] = {}

        for email in user_emails:
            events = self.get_calendar(email)
            if events is not None:
                calendars[email] = events

        return calendars

    def set_users(self, users: List[UserInfo]) -> None:
        """儲存使用者資訊到快取"""
        for user in users:
            cache_key = f"user:{user.email}"
            self._user_cache[cache_key] = user

    def get_user(self, email: str) -> Optional[UserInfo]:
        """從快取取得使用者資訊"""
        cache_key = f"user:{email}"
        return self._user_cache.get(cache_key)

    def get_users(self, user_emails: List[str]) -> List[UserInfo]:
        """從快取取得多位使用者資訊"""
        users: List[UserInfo] = []
        for email in user_emails:
            user = self.get_user(email)
            if user:
                users.append(user)
        return users

    @property
    def last_sync(self) -> Optional[datetime]:
        """取得最後同步時間"""
        return self._last_sync

    @property
    def next_sync(self) -> Optional[datetime]:
        """取得下次同步時間"""
        if self._last_sync is None:
            return None
        return (self._last_sync + timedelta(minutes=self._settings.sync_interval_minutes)).astimezone(self._timezone)

    @property
    def is_syncing(self) -> bool:
        """是否正在同步"""
        return self._is_syncing

    @is_syncing.setter
    def is_syncing(self, value: bool) -> None:
        """設定同步狀態"""
        self._is_syncing = value

    @property
    def error_message(self) -> Optional[str]:
        """取得錯誤訊息"""
        return self._error_message

    @error_message.setter
    def error_message(self, value: Optional[str]) -> None:
        """設定錯誤訊息"""
        self._error_message = value

    def get_total_events(self) -> int:
        """取得快取中的總事件數"""
        total = 0
        for key in self._calendar_cache.keys():
            if key.startswith("calendar:"):
                events = self._calendar_cache.get(key)
                if events:
                    total += len(events)
        return total

    def get_total_users(self) -> int:
        """取得快取中的使用者數"""
        return sum(1 for key in self._calendar_cache.keys() if key.startswith("calendar:"))

    def is_cache_valid(self) -> bool:
        """檢查快取是否有效"""
        if self._last_sync is None:
            return False

        # 檢查是否超過快取時間
        cache_duration = timedelta(minutes=self._settings.cache_duration_minutes)
        now = datetime.now(self._timezone)
        return now - self._last_sync < cache_duration

    def clear(self) -> None:
        """清除所有快取"""
        self._calendar_cache.clear()
        self._user_cache.clear()
        self._last_sync = None
        logger.info("已清除所有快取")
