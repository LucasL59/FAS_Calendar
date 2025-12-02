"""
行事曆資料模型
定義 API 請求與回應的資料結構
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ShowAs(str, Enum):
    """行程狀態"""
    FREE = "free"
    TENTATIVE = "tentative"
    BUSY = "busy"
    OOF = "oof"  # Out of Office
    WORKING_ELSEWHERE = "workingElsewhere"
    UNKNOWN = "unknown"


class DateTimeInfo(BaseModel):
    """日期時間資訊"""
    date_time: datetime = Field(..., alias="dateTime")
    time_zone: str = Field(default="Asia/Taipei", alias="timeZone")

    class Config:
        populate_by_name = True


class Location(BaseModel):
    """地點資訊"""
    display_name: Optional[str] = Field(default=None, alias="displayName")

    class Config:
        populate_by_name = True


class CalendarEvent(BaseModel):
    """行事曆事件"""
    id: str = Field(default="")
    subject: str = Field(default="(無標題)")
    start: DateTimeInfo
    end: DateTimeInfo
    location: Optional[Location] = None
    show_as: ShowAs = Field(default=ShowAs.BUSY, alias="showAs")
    is_all_day: bool = Field(default=False, alias="isAllDay")
    user_email: str = Field(default="", alias="userEmail")
    user_name: str = Field(default="", alias="userName")

    class Config:
        populate_by_name = True


class UserInfo(BaseModel):
    """使用者資訊"""
    email: str
    display_name: str = Field(default="", alias="displayName")
    color: str = Field(default="#3174ad")  # 預設顏色

    class Config:
        populate_by_name = True


class UserCalendar(BaseModel):
    """使用者行事曆"""
    user: UserInfo
    events: List[CalendarEvent] = Field(default_factory=list)


class CalendarEventResponse(BaseModel):
    """行事曆事件回應"""
    last_sync: Optional[datetime] = Field(default=None, alias="lastSync")
    calendars: Dict[str, List[CalendarEvent]] = Field(default_factory=dict)
    users: List[UserInfo] = Field(default_factory=list)
    oncall_events: List[CalendarEvent] = Field(default_factory=list, alias="oncallEvents")

    class Config:
        populate_by_name = True


class AvailabilitySlot(BaseModel):
    """可用時段"""
    start: datetime
    end: datetime
    duration_minutes: int = Field(alias="durationMinutes")

    class Config:
        populate_by_name = True


class AvailabilityResponse(BaseModel):
    """可用時段回應"""
    slots: List[AvailabilitySlot] = Field(default_factory=list)
    checked_users: List[str] = Field(default_factory=list, alias="checkedUsers")

    class Config:
        populate_by_name = True


class SyncStatus(BaseModel):
    """同步狀態"""
    last_sync: Optional[datetime] = Field(default=None, alias="lastSync")
    next_sync: Optional[datetime] = Field(default=None, alias="nextSync")
    is_syncing: bool = Field(default=False, alias="isSyncing")
    sync_interval_minutes: int = Field(default=10, alias="syncIntervalMinutes")
    total_events: int = Field(default=0, alias="totalEvents")
    total_users: int = Field(default=0, alias="totalUsers")
    error_message: Optional[str] = Field(default=None, alias="errorMessage")

    class Config:
        populate_by_name = True
