/**
 * 行事曆相關類型定義
 */

// 行程狀態
export type ShowAs = 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';

// 日期時間資訊
export interface DateTimeInfo {
  dateTime: string;
  timeZone: string;
}

// 地點資訊
export interface Location {
  displayName?: string;
}

// 行事曆事件
export interface CalendarEvent {
  id: string;
  subject: string;
  start: DateTimeInfo;
  end: DateTimeInfo;
  location?: Location;
  showAs: ShowAs;
  isAllDay: boolean;
  userEmail: string;
  userName: string;
}

// 使用者資訊
export interface UserInfo {
  email: string;
  displayName: string;
  color: string;
}

// 行事曆事件回應
export interface CalendarEventResponse {
  lastSync: string | null;
  calendars: Record<string, CalendarEvent[]>;
  users: UserInfo[];
  oncallEvents?: CalendarEvent[];
}

// 可用時段
export interface AvailabilitySlot {
  start: string;
  end: string;
  durationMinutes: number;
}

// 可用時段回應
export interface AvailabilityResponse {
  slots: AvailabilitySlot[];
  checkedUsers: string[];
}

// 同步狀態
export interface SyncStatus {
  lastSync: string | null;
  nextSync: string | null;
  isSyncing: boolean;
  syncIntervalMinutes: number;
  totalEvents: number;
  totalUsers: number;
  errorMessage: string | null;
}

// FullCalendar 事件格式
export interface FullCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  classNames?: string[];
  extendedProps: {
    userEmail: string;
    userName: string;
    showAs: ShowAs;
    location?: string;
    originalSubject: string;
    isHoliday?: boolean;
    isPast?: boolean;
    isOncall?: boolean;
  };
}

// 日期範圍
export interface DateRange {
  start: Date;
  end: Date;
}

export interface EventAnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}
