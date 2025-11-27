/**
 * 台灣國定假日 (2024-2027)
 * 依照 CalendarEvent 結構提供給前端顯示
 */
import type { CalendarEvent } from '../types/calendar';

interface HolidayDefinition {
  subject: string;
  date: string; // YYYY-MM-DD
}

const createHoliday = (subject: string, date: string): CalendarEvent => ({
  id: `holiday-${date}`,
  subject,
  start: {
    dateTime: `${date}T00:00:00+08:00`,
    timeZone: 'Asia/Taipei',
  },
  end: {
    dateTime: `${date}T23:59:59+08:00`,
    timeZone: 'Asia/Taipei',
  },
  location: { displayName: '台灣' },
  showAs: 'free',
  isAllDay: true,
  userEmail: 'holiday@taiwan',
  userName: '台灣節日',
});

const HOLIDAY_DEFINITIONS: HolidayDefinition[] = [
  // 2024
  { subject: '元旦', date: '2024-01-01' },
  { subject: '除夕', date: '2024-02-08' },
  { subject: '春節假期', date: '2024-02-09' },
  { subject: '春節', date: '2024-02-10' },
  { subject: '春節假期', date: '2024-02-12' },
  { subject: '春節假期', date: '2024-02-13' },
  { subject: '春節補假', date: '2024-02-14' },
  { subject: '和平紀念日', date: '2024-02-28' },
  { subject: '兒童節', date: '2024-04-04' },
  { subject: '清明節', date: '2024-04-05' },
  { subject: '端午節', date: '2024-06-10' },
  { subject: '中秋節', date: '2024-09-17' },
  { subject: '國慶日', date: '2024-10-10' },

  // 2025
  { subject: '元旦', date: '2025-01-01' },
  { subject: '除夕', date: '2025-01-29' },
  { subject: '春節假期', date: '2025-01-30' },
  { subject: '春節', date: '2025-01-31' },
  { subject: '春節假期', date: '2025-02-01' },
  { subject: '春節補假', date: '2025-02-03' },
  { subject: '和平紀念日', date: '2025-02-28' },
  { subject: '兒童節', date: '2025-04-04' },
  { subject: '清明節', date: '2025-04-05' },
  { subject: '端午節', date: '2025-06-02' },
  { subject: '中秋節', date: '2025-09-18' },
  { subject: '國慶日', date: '2025-10-10' },

  // 2026
  { subject: '元旦', date: '2026-01-01' },
  { subject: '除夕', date: '2026-02-16' },
  { subject: '春節假期', date: '2026-02-17' },
  { subject: '春節', date: '2026-02-18' },
  { subject: '春節假期', date: '2026-02-19' },
  { subject: '春節補假', date: '2026-02-20' },
  { subject: '和平紀念日', date: '2026-02-28' },
  { subject: '兒童節', date: '2026-04-04' },
  { subject: '清明節', date: '2026-04-05' },
  { subject: '端午節', date: '2026-06-19' },
  { subject: '中秋節', date: '2026-09-25' },
  { subject: '國慶日', date: '2026-10-10' },

  // 2027
  { subject: '元旦', date: '2027-01-01' },
  { subject: '除夕', date: '2027-02-05' },
  { subject: '春節假期', date: '2027-02-06' },
  { subject: '春節', date: '2027-02-07' },
  { subject: '春節假期', date: '2027-02-08' },
  { subject: '春節補假', date: '2027-02-09' },
  { subject: '和平紀念日', date: '2027-02-28' },
  { subject: '兒童節', date: '2027-04-04' },
  { subject: '清明節', date: '2027-04-05' },
  { subject: '端午節', date: '2027-06-09' },
  { subject: '中秋節', date: '2027-09-15' },
  { subject: '國慶日', date: '2027-10-10' },
];

export const FALLBACK_TAIWAN_HOLIDAYS: CalendarEvent[] = HOLIDAY_DEFINITIONS.map((item) =>
  createHoliday(item.subject, item.date)
);

export const TAIWAN_HOLIDAYS = FALLBACK_TAIWAN_HOLIDAYS;
