"""get_user_calendar 跟隨 @odata.nextLink 續頁的回歸測試"""

import asyncio
from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.services.graph_service import GraphService

NEXT_LINK = "https://graph.microsoft.com/v1.0/users/user@example.com/calendarView?$skiptoken=page2"


def _settings_stub() -> SimpleNamespace:
    return SimpleNamespace(
        timezone="Asia/Taipei",
        timezone_info=ZoneInfo("Asia/Taipei"),
        is_azure_configured=False,
        user_email_list=["user@example.com"],
        sync_days_back=365,
        sync_days_ahead=60,
        sync_interval_minutes=15,
        cache_duration_minutes=15,
    )


def _graph_event(event_id: str, start: str, end: str) -> dict:
    return {
        "id": event_id,
        "subject": f"測試事件 {event_id}",
        "start": {"dateTime": start, "timeZone": "Asia/Taipei"},
        "end": {"dateTime": end, "timeZone": "Asia/Taipei"},
        "location": {"displayName": ""},
        "showAs": "busy",
        "isAllDay": False,
    }


def _install_pages(service: GraphService, pages: list) -> dict:
    """以假回應取代 _make_request，回傳 calendarView 呼叫紀錄。"""
    calls = {"count": 0, "urls": []}

    async def fake_request(method: str, url: str, **kwargs) -> dict:
        if "calendarView" not in url:
            return {"displayName": "測試使用者", "mail": "user@example.com"}
        calls["urls"].append(url)
        index = calls["count"]
        calls["count"] += 1
        return pages[min(index, len(pages) - 1)]

    service._make_request = fake_request
    return calls


def _fetch(service: GraphService) -> list:
    return asyncio.run(
        service.get_user_calendar(
            "user@example.com",
            datetime(2026, 1, 1),
            datetime(2026, 12, 31),
        )
    )


def test_merges_events_across_next_link_pages():
    service = GraphService(settings=_settings_stub())
    calls = _install_pages(service, [
        {
            "value": [
                _graph_event("evt-1", "2026-01-05T09:00:00", "2026-01-05T10:00:00"),
                _graph_event("evt-2", "2026-01-06T09:00:00", "2026-01-06T10:00:00"),
            ],
            "@odata.nextLink": NEXT_LINK,
        },
        {"value": [_graph_event("evt-3", "2026-11-30T09:00:00", "2026-11-30T10:00:00")]},
    ])

    events = _fetch(service)

    assert calls["count"] == 2
    assert calls["urls"][1] == NEXT_LINK
    # 兩頁事件皆保留，且最新（第二頁）的事件不再被截掉
    assert [event.id for event in events] == ["evt-1", "evt-2", "evt-3"]


def test_single_page_response_is_fetched_once():
    service = GraphService(settings=_settings_stub())
    calls = _install_pages(service, [
        {"value": [_graph_event("evt-1", "2026-01-05T09:00:00", "2026-01-05T10:00:00")]},
    ])

    events = _fetch(service)

    assert calls["count"] == 1
    assert len(events) == 1


def test_stops_paging_at_max_calendar_pages(monkeypatch):
    monkeypatch.setattr(GraphService, "MAX_CALENDAR_PAGES", 3)
    service = GraphService(settings=_settings_stub())
    calls = _install_pages(service, [
        {
            "value": [_graph_event("evt-1", "2026-01-05T09:00:00", "2026-01-05T10:00:00")],
            "@odata.nextLink": NEXT_LINK,
        },
    ])

    events = _fetch(service)

    assert calls["count"] == 3
    assert len(events) == 3
