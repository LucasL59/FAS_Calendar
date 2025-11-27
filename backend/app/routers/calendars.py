"""
行事曆 API 路由
提供行事曆查詢、空檔查詢等 API 端點
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger

from ..config import Settings, get_settings
from ..models import (
    AvailabilityResponse,
    AvailabilitySlot,
    CalendarEvent,
    CalendarEventResponse,
    SyncStatus,
    UserInfo,
)
from ..services import CacheService, GraphService, SyncService

router = APIRouter(prefix="/api", tags=["calendars"])

# 全域服務實例 (將在 main.py 中初始化)
_graph_service: Optional[GraphService] = None
_cache_service: Optional[CacheService] = None
_sync_service: Optional[SyncService] = None


def init_services(
    graph_service: GraphService,
    cache_service: CacheService,
    sync_service: SyncService,
) -> None:
    """初始化服務實例"""
    global _graph_service, _cache_service, _sync_service
    _graph_service = graph_service
    _cache_service = cache_service
    _sync_service = sync_service


def get_graph_service() -> GraphService:
    """取得 Graph 服務"""
    if _graph_service is None:
        raise HTTPException(status_code=500, detail="Graph 服務未初始化")
    return _graph_service


def get_cache_service() -> CacheService:
    """取得快取服務"""
    if _cache_service is None:
        raise HTTPException(status_code=500, detail="快取服務未初始化")
    return _cache_service


def get_sync_service() -> SyncService:
    """取得同步服務"""
    if _sync_service is None:
        raise HTTPException(status_code=500, detail="同步服務未初始化")
    return _sync_service


@router.get("/calendars/events", response_model=CalendarEventResponse)
async def get_events(
    start: Optional[datetime] = Query(None, description="開始日期"),
    end: Optional[datetime] = Query(None, description="結束日期"),
    users: Optional[str] = Query(None, description="使用者信箱 (逗號分隔)，留空則取得所有人"),
    settings: Settings = Depends(get_settings),
    cache_service: CacheService = Depends(get_cache_service),
):
    """
    取得行事曆事件

    - **start**: 開始日期 (ISO 8601 格式)
    - **end**: 結束日期 (ISO 8601 格式)
    - **users**: 使用者信箱 (逗號分隔)，留空則取得所有人
    """
    # 決定要查詢的使用者
    if users:
        user_emails = [email.strip() for email in users.split(",") if email.strip()]
    else:
        user_emails = settings.user_email_list

    if not user_emails:
        return CalendarEventResponse(
            lastSync=cache_service.last_sync,
            calendars={},
            users=[],
        )

    # 從快取取得資料
    calendars = cache_service.get_all_calendars(user_emails)
    user_infos = cache_service.get_users(user_emails)

    # 如果快取為空，回傳空資料 (等待同步)
    if not calendars:
        logger.warning("快取為空，請等待同步完成")
        # 建立基本使用者資訊
        user_infos = [
            UserInfo(email=email, display_name=email.split("@")[0], color="#3174ad")
            for email in user_emails
        ]
        return CalendarEventResponse(
            lastSync=None,
            calendars={email: [] for email in user_emails},
            users=user_infos,
        )

    # 篩選日期範圍
    if start or end:
        filtered_calendars = {}
        for email, events in calendars.items():
            filtered_events = []
            for event in events:
                event_start = event.start.date_time
                event_end = event.end.date_time

                # 檢查是否在範圍內
                if start and event_end < start:
                    continue
                if end and event_start > end:
                    continue

                filtered_events.append(event)
            filtered_calendars[email] = filtered_events
        calendars = filtered_calendars

    return CalendarEventResponse(
        lastSync=cache_service.last_sync,
        calendars=calendars,
        users=user_infos,
    )


@router.get("/calendars/availability", response_model=AvailabilityResponse)
async def get_availability(
    start: datetime = Query(..., description="開始日期"),
    end: datetime = Query(..., description="結束日期"),
    duration: int = Query(60, description="會議時長 (分鐘)"),
    users: Optional[str] = Query(None, description="使用者信箱 (逗號分隔)"),
    settings: Settings = Depends(get_settings),
    cache_service: CacheService = Depends(get_cache_service),
):
    """
    查詢空檔時段

    找出所有指定使用者都有空的時段

    - **start**: 開始日期 (ISO 8601 格式)
    - **end**: 結束日期 (ISO 8601 格式)
    - **duration**: 會議時長 (分鐘)，預設 60 分鐘
    - **users**: 使用者信箱 (逗號分隔)，留空則查詢所有人
    """
    try:
        # 移除 timezone 資訊以確保比較一致
        start_naive = start.replace(tzinfo=None) if start.tzinfo else start
        end_naive = end.replace(tzinfo=None) if end.tzinfo else end
        
        # 決定要查詢的使用者
        if users:
            user_emails = [email.strip() for email in users.split(",") if email.strip()]
        else:
            user_emails = settings.user_email_list

        if not user_emails:
            return AvailabilityResponse(slots=[], checkedUsers=[])

        # 從快取取得資料
        calendars = cache_service.get_all_calendars(user_emails)

        if not calendars:
            return AvailabilityResponse(slots=[], checkedUsers=user_emails)

        # 收集所有忙碌時段
        busy_slots: List[tuple] = []
        for email, events in calendars.items():
            for event in events:
                # 只考慮忙碌和暫定的事件
                if event.show_as in ["busy", "tentative", "oof"]:
                    # 確保 datetime 是 naive (無 timezone)
                    event_start = event.start.date_time
                    event_end = event.end.date_time
                    
                    if event_start.tzinfo:
                        event_start = event_start.replace(tzinfo=None)
                    if event_end.tzinfo:
                        event_end = event_end.replace(tzinfo=None)

                    # 確保在查詢範圍內
                    if event_end > start_naive and event_start < end_naive:
                        busy_slots.append((
                            max(event_start, start_naive),
                            min(event_end, end_naive),
                        ))

        # 合併重疊的忙碌時段
        busy_slots.sort(key=lambda x: x[0])
        merged_busy: List[tuple] = []
        for slot_start, slot_end in busy_slots:
            if merged_busy and slot_start <= merged_busy[-1][1]:
                # 與前一個時段重疊，合併
                merged_busy[-1] = (merged_busy[-1][0], max(merged_busy[-1][1], slot_end))
            else:
                merged_busy.append((slot_start, slot_end))

        # 找出空檔時段
        available_slots: List[AvailabilitySlot] = []
        duration_delta = timedelta(minutes=duration)

        # 工作時間設定 (9:00 - 18:00)
        work_start_hour = 9
        work_end_hour = 18

        current = start_naive
        busy_index = 0

        while current < end_naive:
            # 跳過非工作時間
            if current.hour < work_start_hour:
                current = current.replace(hour=work_start_hour, minute=0, second=0, microsecond=0)
                continue
            if current.hour >= work_end_hour:
                current = (current + timedelta(days=1)).replace(
                    hour=work_start_hour, minute=0, second=0, microsecond=0
                )
                continue

            # 跳過週末
            if current.weekday() >= 5:  # 週六=5, 週日=6
                current = (current + timedelta(days=1)).replace(
                    hour=work_start_hour, minute=0, second=0, microsecond=0
                )
                continue

            # 檢查是否與忙碌時段重疊
            while busy_index < len(merged_busy) and merged_busy[busy_index][1] <= current:
                busy_index += 1

            if busy_index < len(merged_busy) and merged_busy[busy_index][0] <= current:
                # 目前時間在忙碌時段內，跳到忙碌結束
                current = merged_busy[busy_index][1]
                continue

            # 計算可用時段結束時間
            slot_end = current + duration_delta

            # 確保不超過工作時間
            day_end = current.replace(hour=work_end_hour, minute=0, second=0, microsecond=0)
            if slot_end > day_end:
                current = (current + timedelta(days=1)).replace(
                    hour=work_start_hour, minute=0, second=0, microsecond=0
                )
                continue

            # 確保不與忙碌時段重疊
            if busy_index < len(merged_busy) and slot_end > merged_busy[busy_index][0]:
                current = merged_busy[busy_index][1]
                continue

            # 找到一個空檔
            available_slots.append(AvailabilitySlot(
                start=current,
                end=slot_end,
                durationMinutes=duration,
            ))

            # 移動到下一個時段 (以 30 分鐘為單位)
            current = current + timedelta(minutes=30)

        return AvailabilityResponse(
            slots=available_slots[:50],  # 最多回傳 50 個時段
            checkedUsers=user_emails,
        )
    except Exception as e:
        logger.error(f"查詢空檔時發生錯誤: {e}")
        raise HTTPException(status_code=500, detail=f"查詢空檔失敗: {str(e)}")


@router.get("/users", response_model=List[UserInfo])
async def get_users(
    settings: Settings = Depends(get_settings),
    cache_service: CacheService = Depends(get_cache_service),
):
    """取得使用者清單"""
    user_emails = settings.user_email_list
    users = cache_service.get_users(user_emails)

    # 如果快取為空，回傳基本資訊
    if not users:
        users = [
            UserInfo(email=email, display_name=email.split("@")[0], color="#3174ad")
            for email in user_emails
        ]

    return users


@router.post("/sync")
async def trigger_sync(
    sync_service: SyncService = Depends(get_sync_service),
):
    """手動觸發同步"""
    if _cache_service and _cache_service.is_syncing:
        raise HTTPException(status_code=409, detail="同步正在進行中")

    success = await sync_service.sync_calendars()

    if success:
        return {"message": "同步完成", "success": True}
    else:
        raise HTTPException(status_code=500, detail="同步失敗")


@router.get("/sync/status", response_model=SyncStatus)
async def get_sync_status(
    settings: Settings = Depends(get_settings),
    cache_service: CacheService = Depends(get_cache_service),
):
    """取得同步狀態"""
    return SyncStatus(
        lastSync=cache_service.last_sync,
        nextSync=cache_service.next_sync,
        isSyncing=cache_service.is_syncing,
        syncIntervalMinutes=settings.sync_interval_minutes,
        totalEvents=cache_service.get_total_events(),
        totalUsers=cache_service.get_total_users(),
        errorMessage=cache_service.error_message,
    )


@router.get("/health")
async def health_check(
    settings: Settings = Depends(get_settings),
):
    """健康檢查"""
    return {
        "status": "healthy",
        "azure_configured": settings.is_azure_configured,
        "user_count": len(settings.user_email_list),
        "timestamp": datetime.now().isoformat(),
    }
