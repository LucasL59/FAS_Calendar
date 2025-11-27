"""
同步服務
負責定期同步行事曆資料
"""

from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from ..config import Settings, get_settings
from .cache_service import CacheService
from .graph_service import GraphService


class SyncService:
    """同步服務類別"""

    def __init__(
        self,
        graph_service: GraphService,
        cache_service: CacheService,
        settings: Optional[Settings] = None,
    ):
        """初始化同步服務"""
        self._graph_service = graph_service
        self._cache_service = cache_service
        self._settings = settings or get_settings()
        self._scheduler: Optional[AsyncIOScheduler] = None

    async def sync_calendars(self) -> bool:
        """
        同步所有使用者的行事曆

        Returns:
            是否同步成功
        """
        if self._cache_service.is_syncing:
            logger.warning("同步正在進行中，跳過此次同步")
            return False

        self._cache_service.is_syncing = True
        self._cache_service.error_message = None

        try:
            user_emails = self._settings.user_email_list

            if not user_emails:
                logger.warning("未設定使用者信箱，跳過同步")
                self._cache_service.error_message = "未設定使用者信箱"
                return False

            logger.info(f"開始同步 {len(user_emails)} 位使用者的行事曆")

            # 計算查詢日期範圍
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            start_date = today - timedelta(days=self._settings.sync_days_back)
            end_date = today + timedelta(days=self._settings.sync_days_ahead)

            # 取得使用者資訊
            users = await self._graph_service.get_users_info(user_emails)
            self._cache_service.set_users(users)

            # 取得行事曆資料
            calendars = await self._graph_service.get_team_calendars(
                user_emails, start_date, end_date
            )

            # 儲存到快取
            self._cache_service.set_calendars(calendars)

            total_events = sum(len(events) for events in calendars.values())
            logger.info(f"同步完成，共 {total_events} 個事件")

            return True

        except Exception as e:
            error_msg = f"同步失敗: {e}"
            logger.error(error_msg)
            self._cache_service.error_message = error_msg
            return False

        finally:
            self._cache_service.is_syncing = False

    def start_scheduler(self) -> None:
        """啟動排程器"""
        if self._scheduler is not None:
            logger.warning("排程器已在運行中")
            return

        self._scheduler = AsyncIOScheduler()

        # 設定定期同步任務
        trigger = IntervalTrigger(minutes=self._settings.sync_interval_minutes)
        self._scheduler.add_job(
            self.sync_calendars,
            trigger=trigger,
            id="calendar_sync",
            name="行事曆同步",
            replace_existing=True,
        )

        self._scheduler.start()
        logger.info(f"排程器已啟動，每 {self._settings.sync_interval_minutes} 分鐘同步一次")

    def stop_scheduler(self) -> None:
        """停止排程器"""
        if self._scheduler is not None:
            self._scheduler.shutdown()
            self._scheduler = None
            logger.info("排程器已停止")

    @property
    def is_scheduler_running(self) -> bool:
        """排程器是否運行中"""
        return self._scheduler is not None and self._scheduler.running
