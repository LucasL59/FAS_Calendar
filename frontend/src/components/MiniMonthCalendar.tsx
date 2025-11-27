import { useMemo } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniMonthCalendarProps {
  anchorDate: Date;
  selectedDate: Date;
  onMonthChange: (nextAnchor: Date) => void;
  onDateSelect: (date: Date) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function MiniMonthCalendar({
  anchorDate,
  selectedDate,
  onMonthChange,
  onDateSelect,
}: MiniMonthCalendarProps) {
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  const today = new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-gray-100"
          onClick={() => onMonthChange(addMonths(anchorDate, -1))}
          aria-label="上一個月"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {format(anchorDate, 'yyyy年M月', { locale: zhTW })}
        </span>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-gray-100"
          onClick={() => onMonthChange(addMonths(anchorDate, 1))}
          aria-label="下一個月"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-[11px] text-gray-500 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-sm">
        {calendarDays.map((day) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const muted = !isSameMonth(day, anchorDate);

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center transition-colors
                ${isSelected ? 'bg-blue-600 text-white font-semibold shadow-sm' : ''}
                ${!isSelected && isToday ? 'text-blue-600 font-semibold' : ''}
                ${!isSelected && !isToday ? 'text-gray-700' : ''}
                ${muted && !isSelected ? 'text-gray-300' : ''}
                hover:bg-blue-50`}
              onClick={() => onDateSelect(day)}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MiniMonthCalendar;
