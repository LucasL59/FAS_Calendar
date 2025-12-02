"""
Microsoft Graph API 服務
使用 httpx 直接呼叫 Microsoft Graph REST API
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from urllib.parse import quote

import httpx
from azure.identity.aio import ClientSecretCredential
from loguru import logger
from dateutil import parser
from zoneinfo import ZoneInfo

from ..config import Settings, get_settings
from ..models import CalendarEvent, DateTimeInfo, Location, ShowAs, UserInfo


class GraphService:
    """Microsoft Graph API 服務類別"""

    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"

    # 使用者顏色對照表
    USER_COLORS = [
        "#3174ad",  # 藍色
        "#e68619",  # 橘色
        "#0b6a0b",  # 綠色
        "#8764b8",  # 紫色
        "#c03434",  # 紅色
        "#00a4a4",  # 青色
        "#d83b01",  # 深橘色
        "#107c10",  # 深綠色
        "#5c2d91",  # 深紫色
        "#a4262c",  # 深紅色
    ]

    def __init__(self, settings: Optional[Settings] = None):
        """初始化 Graph 服務"""
        self._settings = settings or get_settings()
        self._credential: Optional[ClientSecretCredential] = None
        self._http_client: Optional[httpx.AsyncClient] = None
        self._user_color_map: Dict[str, str] = {}
        self._access_token: Optional[str] = None
        self._token_expires: Optional[datetime] = None
        self._timezone: ZoneInfo = self._settings.timezone_info

    async def _get_access_token(self) -> str:
        """取得 Access Token"""
        # 檢查 token 是否有效
        if self._access_token and self._token_expires:
            if datetime.now(timezone.utc) < self._token_expires - timedelta(minutes=5):
                return self._access_token

        if not self._settings.is_azure_configured:
            raise ValueError(
                "Azure AD 設定不完整，請檢查 AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
            )

        if self._credential is None:
            self._credential = ClientSecretCredential(
                tenant_id=self._settings.azure_tenant_id,
                client_id=self._settings.azure_client_id,
                client_secret=self._settings.azure_client_secret,
            )

        # 取得新 token
        token = await self._credential.get_token("https://graph.microsoft.com/.default")
        self._access_token = token.token
        self._token_expires = datetime.fromtimestamp(token.expires_on, tz=timezone.utc)

        return self._access_token

    async def _get_http_client(self) -> httpx.AsyncClient:
        """取得 HTTP 客戶端"""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client

    async def _make_request(self, method: str, url: str, **kwargs) -> dict:
        """發送 Graph API 請求"""
        token = await self._get_access_token()
        client = await self._get_http_client()

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            # 設定時區偏好，讓 Graph API 返回台灣時區的時間
            "Prefer": 'outlook.timezone="Asia/Taipei"',
        }

        response = await client.request(method, url, headers=headers, **kwargs)
        response.raise_for_status()

        return response.json() if response.content else {}

    def _get_user_color(self, email: str) -> str:
        """取得使用者對應的顏色"""
        if email not in self._user_color_map:
            color_index = len(self._user_color_map) % len(self.USER_COLORS)
            self._user_color_map[email] = self.USER_COLORS[color_index]
        return self._user_color_map[email]

    async def get_user_info(self, email: str) -> Optional[UserInfo]:
        """取得使用者資訊"""
        try:
            url = f"{self.GRAPH_BASE_URL}/users/{quote(email)}?$select=displayName,mail,userPrincipalName"
            data = await self._make_request("GET", url)

            return UserInfo(
                email=email,
                display_name=data.get("displayName") or email.split("@")[0],
                color=self._get_user_color(email),
            )
        except Exception as e:
            logger.warning(f"無法取得使用者資訊 {email}: {e}")
            return UserInfo(
                email=email,
                display_name=email.split("@")[0],
                color=self._get_user_color(email),
            )

    async def get_user_calendar(
        self,
        email: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[CalendarEvent]:
        """
        取得單一使用者的行事曆事件

        Args:
            email: 使用者信箱
            start_date: 開始日期
            end_date: 結束日期

        Returns:
            行事曆事件清單
        """
        try:
            # 取得使用者資訊
            user_info = await self.get_user_info(email)
            user_name = user_info.display_name if user_info else email.split("@")[0]

            # 建立 URL
            start_str = start_date.strftime("%Y-%m-%dT%H:%M:%S")
            end_str = end_date.strftime("%Y-%m-%dT%H:%M:%S")

            url = (
                f"{self.GRAPH_BASE_URL}/users/{quote(email)}/calendarView"
                f"?startDateTime={start_str}&endDateTime={end_str}"
                f"&$select=id,subject,start,end,location,showAs,isAllDay"
                f"&$top=500&$orderby=start/dateTime"
            )

            data = await self._make_request("GET", url)

            events: List[CalendarEvent] = []
            for event in data.get("value", []):
                try:
                    # 解析開始時間 (Graph API 已根據 Prefer header 返回台灣時區時間)
                    start_info = event.get("start", {})
                    start_dt_str = start_info.get("dateTime", "")
                    if start_dt_str:
                        start_dt = self._parse_graph_datetime(start_dt_str, self._timezone)
                    else:
                        start_dt = datetime.now(self._timezone)

                    # 解析結束時間
                    end_info = event.get("end", {})
                    end_dt_str = end_info.get("dateTime", "")
                    if end_dt_str:
                        end_dt = self._parse_graph_datetime(end_dt_str, self._timezone)
                    else:
                        end_dt = start_dt + timedelta(hours=1)

                    # 解析狀態
                    show_as_str = event.get("showAs", "busy").lower()
                    try:
                        show_as = ShowAs(show_as_str)
                    except ValueError:
                        show_as = ShowAs.UNKNOWN

                    # 解析地點
                    location_data = event.get("location", {})
                    location_name = location_data.get("displayName") if location_data else None

                    calendar_event = CalendarEvent(
                        id=event.get("id", ""),
                        subject=event.get("subject") or "(無標題)",
                        start=DateTimeInfo(
                            dateTime=start_dt,
                            timeZone=start_info.get("timeZone", "Asia/Taipei"),
                        ),
                        end=DateTimeInfo(
                            dateTime=end_dt,
                            timeZone=end_info.get("timeZone", "Asia/Taipei"),
                        ),
                        location=Location(displayName=location_name),
                        showAs=show_as,
                        isAllDay=event.get("isAllDay", False),
                        userEmail=email,
                        userName=user_name,
                    )
                    events.append(calendar_event)
                except Exception as e:
                    logger.warning(f"解析事件失敗: {e}")
                    continue

            logger.info(f"取得 {email} 的 {len(events)} 個事件")
            return events

        except Exception as e:
            logger.error(f"取得 {email} 行事曆失敗: {e}")
            raise

    async def get_team_calendars(
        self,
        user_emails: List[str],
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, List[CalendarEvent]]:
        """
        批次取得多位使用者的行事曆

        Args:
            user_emails: 使用者信箱清單
            start_date: 開始日期
            end_date: 結束日期

        Returns:
            以信箱為 key 的行事曆事件字典
        """
        calendars: Dict[str, List[CalendarEvent]] = {}

        # 並行取得所有使用者的行事曆
        tasks = [
            self.get_user_calendar(email, start_date, end_date)
            for email in user_emails
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for email, result in zip(user_emails, results):
            if isinstance(result, Exception):
                logger.error(f"取得 {email} 行事曆失敗: {result}")
                calendars[email] = []
            else:
                calendars[email] = result

        return calendars

    async def get_users_info(self, user_emails: List[str]) -> List[UserInfo]:
        """取得多位使用者的資訊"""
        tasks = [self.get_user_info(email) for email in user_emails]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        users: List[UserInfo] = []
        for email, result in zip(user_emails, results):
            if isinstance(result, Exception) or result is None:
                users.append(UserInfo(
                    email=email,
                    display_name=email.split("@")[0],
                    color=self._get_user_color(email),
                ))
            else:
                users.append(result)

        return users

    def _parse_graph_datetime(self, value: str, target_tz: ZoneInfo) -> datetime:
        """解析 Graph API 回傳的日期字串並套用指定時區"""
        # Graph API 可能返回沒有時區資訊的字串（依 Prefer header），但也有帶 Z 或 ±offset 的情況
        from dateutil import parser
        parsed = parser.isoparse(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=target_tz)
        return parsed.astimezone(target_tz)

    async def close(self):
        """關閉連線"""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
        if self._credential:
            await self._credential.close()
            self._credential = None
