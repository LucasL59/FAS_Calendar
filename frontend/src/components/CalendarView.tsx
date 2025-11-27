/**
 * 日曆視圖元件 (Google 日曆風格 - 圓潤設計)
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type {
  CalendarApi,
  EventClickArg,
  DatesSetArg,
  DayCellContentArg,
  MoreLinkArg,
  EventApi,
} from '@fullcalendar/core';
import * as solarlunar from 'solarlunar';
import { createPortal } from 'react-dom';
import type {
  CalendarEvent,
  UserInfo,
  FullCalendarEvent,
  DateRange,
  EventAnchorRect,
} from '../types/calendar';

interface MorePopoverState {
  date: Date;
  events: EventApi[];
  anchorRect: DOMRect;
  previousPosition?: { left: number; top: number } | null;
}

function getAdaptiveTextColor(hex: string, preferLight = false): string {
  if (!hex) {
    return preferLight ? '#ffffff' : '#111827';
  }
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return preferLight ? '#ffffff' : '#111827';
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  // 計算相對亮度 (WCAG 公式)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // 優先白色文字時，提高閾值讓更多顏色使用白色（改善可讀性）
  if (preferLight) {
    return luminance < 0.75 ? '#ffffff' : '#1f2937';
  }
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

type MoreLinkArgWithSegs = MoreLinkArg & {
  segs?: { event: EventApi }[];
  hiddenSegs?: { event: EventApi }[];
  allSegs?: { event: EventApi }[];
};

function lightenColor(hex: string, ratio = 0.8): string {
  if (!hex) return hex;
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const num = Number.parseInt(normalized, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mixChannel = (channel: number) =>
    Math.min(255, Math.round(channel + (255 - channel) * ratio));
  const lr = mixChannel(r);
  const lg = mixChannel(g);
  const lb = mixChannel(b);
  return `#${[lr, lg, lb]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

interface CalendarViewProps {
  calendars: Record<string, CalendarEvent[]>;
  users: UserInfo[];
  selectedUsers: string[];
  holidays: CalendarEvent[];
  showHolidays: boolean;
  showLunar?: boolean;
  initialDate?: Date;
  focusDate?: Date;
  view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  colorOverrides?: Record<string, string>;
  selectedEventId?: string;
  onDateRangeChange: (range: DateRange, activeDate?: Date) => void;
  onEventClick?: (event: CalendarEvent, anchor?: EventAnchorRect) => void;
  onCalendarReady?: (api: CalendarApi) => void;
}

export function CalendarView({
  calendars,
  users,
  selectedUsers,
  holidays,
  showHolidays,
  showLunar = true,
  initialDate,
  focusDate,
  view,
  colorOverrides = {},
  selectedEventId,
  onDateRangeChange,
  onEventClick,
  onCalendarReady,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const initialDateRef = useRef<Date>(initialDate ?? new Date());
  const [morePopover, setMorePopover] = useState<MorePopoverState | null>(null);
  const lastMorePopoverPosition = useRef<{ left: number; top: number } | null>(null);

  // 建立使用者顏色對照表
  const userColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((user) => {
      map[user.email] = colorOverrides[user.email] ?? user.color;
    });
    return map;
  }, [users, colorOverrides]);

  // 轉換為 FullCalendar 事件格式
  const events: FullCalendarEvent[] = useMemo(() => {
    const allEvents: FullCalendarEvent[] = [];
    const now = Date.now();

    // 1. 加入一般使用者的事件
    const filteredCalendars = Object.entries(calendars).filter(([email]) =>
      selectedUsers.includes(email)
    );

    filteredCalendars.forEach(([email, userEvents]) => {
      const user = users.find((u) => u.email === email);
      const userName = user?.displayName || email.split('@')[0];
      const baseColor = userColorMap[email] || '#3174ad';

      userEvents.forEach((event) => {
        const eventId = `${email}-${event.id}`;
        const eventEnd = new Date(event.end.dateTime).getTime();
        const isPast = eventEnd < now;
        const backgroundColor = isPast ? lightenColor(baseColor, 0.88) : baseColor;
        const borderColor = isPast ? lightenColor(baseColor, 0.92) : baseColor;
        const textColor = isPast
          ? 'rgba(71, 85, 105, 0.65)'
          : getAdaptiveTextColor(backgroundColor, true);
        const classNames = ['fc-event-rounded'];
        if (isPast) {
          classNames.push('fc-event-past');
        }
        if (selectedEventId && selectedEventId === eventId) {
          classNames.push('fc-event-selected');
        }

        allEvents.push({
          id: eventId,
          title: event.subject,
          start: new Date(event.start.dateTime),
          end: new Date(event.end.dateTime),
          allDay: event.isAllDay,
          backgroundColor,
          borderColor,
          textColor,
          extendedProps: {
            userEmail: email,
            userName,
            showAs: event.showAs,
            location: event.location?.displayName,
            originalSubject: event.subject,
            isHoliday: false,
            isPast,
          },
          classNames,
        });
      });
    });

    // 2. 加入台灣節日 (如果啟用)
    if (showHolidays) {
      holidays.forEach((holiday) => {
        const holidayEnd = new Date(holiday.end.dateTime).getTime();
        const isPastHoliday = holidayEnd < now;
        const eventId = `holiday-${holiday.id}`;
        const baseBg = '#C8E6C9';
        const baseBorder = '#81C784';
        const backgroundColor = isPastHoliday ? lightenColor(baseBg, 0.9) : baseBg;
        const borderColor = isPastHoliday ? lightenColor(baseBorder, 0.95) : baseBorder;
        const textColor = isPastHoliday
          ? 'rgba(30, 64, 45, 0.65)'
          : getAdaptiveTextColor(backgroundColor);
        const classNames = ['fc-event-holiday', 'fc-event-rounded'];
        if (isPastHoliday) {
          classNames.push('fc-event-past');
        }
        if (selectedEventId && selectedEventId === eventId) {
          classNames.push('fc-event-selected');
        }

        allEvents.push({
          id: eventId,
          title: holiday.subject,
          start: new Date(holiday.start.dateTime),
          end: new Date(holiday.end.dateTime),
          allDay: true,
          backgroundColor,
          borderColor,
          textColor,
          extendedProps: {
            userEmail: 'holiday@taiwan',
            userName: '台灣節日',
            showAs: 'free',
            originalSubject: holiday.subject,
            isHoliday: true,
            isPast: isPastHoliday,
          },
          classNames,
        });
      });
    }

    return allEvents;
  }, [calendars, users, selectedUsers, userColorMap, holidays, showHolidays, selectedEventId]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const activeDate = calendarRef.current?.getApi().getDate();
    onDateRangeChange({ start: arg.start, end: arg.end }, activeDate ?? arg.start);
  }, [onDateRangeChange]);

  const openEventDetail = useCallback(
    (eventApi: EventApi, anchor?: EventAnchorRect) => {
      if (!onEventClick) return;
      const userEmail = eventApi.extendedProps?.userEmail as string | undefined;
      if (!userEmail) return;
      const originalEvent = calendars[userEmail]?.find(
        (e) => `${userEmail}-${e.id}` === eventApi.id
      );
      if (originalEvent) {
        onEventClick(originalEvent, anchor);
      }
    },
    [calendars, onEventClick]
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      if (arg.event.extendedProps.isHoliday) {
        return;
      }

      const anchorRectRaw = arg.el?.getBoundingClientRect();
      const anchor: EventAnchorRect | undefined = anchorRectRaw
        ? {
            top: anchorRectRaw.top,
            left: anchorRectRaw.left,
            right: anchorRectRaw.right,
            bottom: anchorRectRaw.bottom,
            width: anchorRectRaw.width,
            height: anchorRectRaw.height,
          }
        : undefined;

      if (arg.el?.closest('.fc-popover')) {
        arg.jsEvent?.stopPropagation?.();
        arg.jsEvent?.stopImmediatePropagation?.();
        arg.jsEvent?.preventDefault?.();
      }

      openEventDetail(arg.event, anchor);
    },
    [openEventDetail]
  );

  const hideDefaultMorePopovers = useCallback(() => {
    const popovers = document.querySelectorAll<HTMLDivElement>('.fc-popover.fc-more-popover');
    popovers.forEach((popover) => {
      popover.style.setProperty('display', 'none', 'important');
      popover.setAttribute('aria-hidden', 'true');
    });
  }, []);

  const handleMoreLinkClick = useCallback((args: MoreLinkArg) => {
    const domArgs = args as MoreLinkArgWithSegs & { dayEl?: HTMLElement; el?: HTMLElement };
    const dayCell =
      domArgs.dayEl ??
      domArgs.el?.closest<HTMLElement>('.fc-daygrid-day') ??
      (args.jsEvent?.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.fc-daygrid-day');
    if (!dayCell) {
      return 'popover';
    }

    const anchorRect = dayCell.getBoundingClientRect();
    const segsSource = domArgs.hiddenSegs ?? domArgs.segs ?? domArgs.allSegs ?? [];
    const events = segsSource.map((seg) => seg.event);
    const previousPosition = lastMorePopoverPosition.current;
    setMorePopover({
      date: args.date,
      events,
      anchorRect,
      previousPosition,
    });
    requestAnimationFrame(hideDefaultMorePopovers);
    args.jsEvent?.preventDefault?.();
    args.jsEvent?.stopPropagation?.();
    return;
  }, [hideDefaultMorePopovers]);

  // 渲染日期格子（農曆始終渲染，用 CSS 控制顯示）
  const renderDayCell = useCallback((args: DayCellContentArg) => {
    const date = args.date;
    const lunar = solarlunar.solar2lunar(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );

    // solarlunar 返回的屬性: dayCn (農曆日), monthCn (農曆月), festival (節日), Term (節氣)
    const lunarText = lunar.festival || lunar.Term || lunar.dayCn;
    const lunarLabel = lunarText ? `(${lunarText})` : '';
    const isToday = args.isToday;
    const isMonthView = args.view.type === 'dayGridMonth';

    // 星期標籤只在月視圖的第一行顯示
    if (isMonthView) {
      const weekdayLabels = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
      const millisecondsInDay = 24 * 60 * 60 * 1000;
      const viewStart = args.view.activeStart ?? args.view.currentStart;
      const daysFromViewStart = Math.floor(
        (date.getTime() - viewStart.getTime()) / millisecondsInDay
      );
      const showWeekday = daysFromViewStart >= 0 && daysFromViewStart < 7;
      const weekdayLabel = weekdayLabels[date.getDay()];

      return {
        html: `
          <div class="fc-daygrid-cell-content">
            ${showWeekday ? `<div class="fc-daygrid-weekday-label">${weekdayLabel}</div>` : ''}
            <div class="fc-daygrid-day-number-row">
              <div class="fc-daygrid-day-number-text ${isToday ? 'is-today' : ''}">${date.getDate()}</div>
              <div class="fc-daygrid-lunar-text">${lunarLabel ?? ''}</div>
            </div>
          </div>
        `,
      };
    }

    // 週/日視圖只顯示日期（星期由欄標題顯示）
    return {
      html: `
        <div class="fc-daygrid-cell-content">
          <div class="fc-daygrid-day-number-row">
            <div class="fc-daygrid-day-number-text ${isToday ? 'is-today' : ''}">${date.getDate()}</div>
            <div class="fc-daygrid-lunar-text">${lunarLabel ?? ''}</div>
          </div>
        </div>
      `,
    };
  }, []);

  // RWD 自動調整
  useEffect(() => {
    const handleResize = () => {
      calendarRef.current?.getApi().updateSize();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const container = calendarContainerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      const api = calendarRef.current?.getApi();
      if (!api || event.ctrlKey || api.view.type !== 'dayGridMonth') return;

      const primaryAxis = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
      if (!primaryAxis || Math.abs(event.deltaY) < 30) return;

      event.preventDefault();
      if (event.deltaY > 0) {
        api.next();
      } else {
        api.prev();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel as EventListenerOrEventListenerObject);
  }, []);

  // 外部要求聚焦到指定日期
  useEffect(() => {
    if (!focusDate) return;
    calendarRef.current?.getApi().gotoDate(focusDate);
  }, [focusDate]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      onCalendarReady?.(api);
    }
  }, [onCalendarReady]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api || api.view.type === view) return;
    api.changeView(view);
  }, [view]);

  return (
    <div ref={calendarContainerRef} className={`h-full fc-google-style ${showLunar ? 'show-lunar' : 'hide-lunar'}`}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={view}
        initialDate={initialDateRef.current}
        headerToolbar={false}
        buttonText={{
          today: '今天',
          month: '月',
          week: '週',
          day: '日',
          list: '列表',
        }}
        locale="zh-tw"
        firstDay={0}
        height="100%"
        fixedWeekCount={false}
        expandRows={true}
        events={events}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        // 格式設定
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short', // 上午/下午
          hour12: true,      // 12小時制
        }}
        slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            meridiem: 'short'
        }}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={true}
        allDayText="全天"
        nowIndicator={true}
        dayMaxEvents={view === 'dayGridMonth' ? 2 : false}
        moreLinkClick={handleMoreLinkClick}
        moreLinkClassNames="text-[11px]"
        moreLinkContent={(args) => `+${args.num} 更多`}
        navLinks={false}
        weekNumbers={false}
        dayHeaderFormat={undefined}
        dayCellContent={renderDayCell}
        eventContent={(arg) => {
          const { userName } = arg.event.extendedProps;
          const eventColor = arg.event.backgroundColor || '#1a73e8';
          const textColor = arg.event.textColor || '#ffffff';
          const isMonthView = arg.view.type === 'dayGridMonth';
          const showDot = !arg.event.allDay && isMonthView;

          if (arg.event.extendedProps.isHoliday) {
            return (
              <div className="flex items-center gap-1 px-1 py-0.5 overflow-hidden w-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-xs font-medium truncate text-emerald-700">
                  {arg.event.title}
                </span>
              </div>
            );
          }

          return (
            <div
              className="event-chip"
              style={{ backgroundColor: eventColor, color: textColor }}
            >
              {showDot && (
                <span className="event-chip-dot" aria-hidden>
                  <span style={{ backgroundColor: eventColor }} />
                </span>
              )}
              <div className="event-chip-body">
                {userName && (
                  <span className="event-chip-user">
                    {userName}
                  </span>
                )}
                <span className="event-chip-title">
                  {arg.event.title}
                </span>
              </div>
            </div>
          );
        }}
      />

      {morePopover && (
        <CustomMorePopover
          data={morePopover}
          onClose={() => setMorePopover(null)}
          onEventSelect={(eventApi, anchor) => openEventDetail(eventApi, anchor)}
          onPositionSettled={(pos) => {
            lastMorePopoverPosition.current = pos;
          }}
        />
      )}
    </div>
  );
}

interface CustomMorePopoverProps {
  data: MorePopoverState;
  onClose: () => void;
  onEventSelect: (event: EventApi, anchor?: EventAnchorRect) => void;
  onPositionSettled: (pos: { left: number; top: number }) => void;
}

function CustomMorePopover({ data, onClose, onEventSelect, onPositionSettled }: CustomMorePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>(() => ({
    left: Math.round(data.anchorRect.left),
    top: Math.round(data.anchorRect.top),
  }));

  useEffect(() => {
    const handlePointerDown = (ev: PointerEvent) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      if (popoverRef.current?.contains(target)) return;
      if (target.closest('.fc-daygrid-more-link')) return;
      onClose();
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const viewportPadding = 16;
    const offset = 12;
    const computePosition = () => {
      const popRect = popoverRef.current?.getBoundingClientRect();
      if (!popRect) {
        return {
          left: Math.round(data.anchorRect.left),
          top: Math.round(data.anchorRect.top),
        };
      }
      let left = data.anchorRect.right + offset;
      if (left + popRect.width + viewportPadding > window.innerWidth) {
        left = data.anchorRect.left - popRect.width - offset;
      }
      if (left < viewportPadding) {
        left = viewportPadding;
      }

      let top = data.anchorRect.top;
      if (top + popRect.height + viewportPadding > window.innerHeight) {
        top = Math.max(viewportPadding, data.anchorRect.bottom - popRect.height - offset);
      }
      if (top < viewportPadding) {
        top = viewportPadding;
      }
      return { left: Math.round(left), top: Math.round(top) };
    };

    const targetPosition = computePosition();
    if (data.previousPosition) {
      setPosition(data.previousPosition);
      requestAnimationFrame(() => setPosition(targetPosition));
    } else {
      setPosition(targetPosition);
    }
    onPositionSettled(targetPosition);
  }, [data, onPositionSettled]);

  const dateLabel = data.date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const content = (
    <div
      ref={popoverRef}
      className="custom-more-popover"
      style={{ left: position.left, top: position.top }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-500">{dateLabel}</div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="關閉更多事件"
        >
          ✕
        </button>
      </div>
      <div className="px-3 py-3 space-y-2 max-h-[360px] overflow-y-auto">
        {data.events.map((eventApi) => {
          const bg = eventApi.backgroundColor || '#1a73e8';
          const textColor = eventApi.textColor || '#fff';
          const userName = eventApi.extendedProps?.userName as string | undefined;
          return (
            <button
              key={eventApi.id + eventApi.start?.toISOString()}
              type="button"
              onClick={(ev) => {
                const rect = (ev.currentTarget as HTMLButtonElement).getBoundingClientRect();
                const anchor: EventAnchorRect = {
                  top: rect.top,
                  left: rect.left,
                  right: rect.right,
                  bottom: rect.bottom,
                  width: rect.width,
                  height: rect.height,
                };
                onEventSelect(eventApi, anchor);
              }}
              className="w-full text-left rounded-xl px-3 py-2 flex flex-col gap-1"
              style={{ backgroundColor: bg, color: textColor }}
            >
              {userName && <span className="text-[11px] font-semibold opacity-90">{userName}</span>}
              <span className="text-sm font-semibold truncate">{eventApi.title}</span>
            </button>
          );
        })}
        {data.events.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-4">沒有其他事件</div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export default CalendarView;
