/**
 * 空檔查詢元件
 * 尋找所有選定成員的共同可用時段
 */

import { useState, useMemo } from 'react';
import { X, Clock, Users, Calendar, ChevronDown, Check } from 'lucide-react';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useAvailability } from '../hooks/useCalendarData';
import type { UserInfo, AvailabilitySlot } from '../types/calendar';

interface AvailabilityFinderProps {
  users: UserInfo[];
  selectedUsers: string[];
  onClose: () => void;
  userColorMap: Record<string, string>;
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 分鐘' },
  { value: 60, label: '1 小時' },
  { value: 90, label: '1.5 小時' },
  { value: 120, label: '2 小時' },
  { value: 180, label: '3 小時' },
];

const DATE_RANGE_OPTIONS = [
  { value: 7, label: '未來 7 天' },
  { value: 14, label: '未來 14 天' },
  { value: 30, label: '未來 30 天' },
];

export function AvailabilityFinder({
  users,
  selectedUsers,
  onClose,
  userColorMap,
}: AvailabilityFinderProps) {
  const [duration, setDuration] = useState(60);
  const [daysAhead, setDaysAhead] = useState(7);
  const [checkedUsers, setCheckedUsers] = useState<string[]>(selectedUsers);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // 計算查詢範圍
  const dateRange = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(addDays(start, daysAhead));
    return { start, end };
  }, [daysAhead]);

  // 查詢可用時段
  const { data, isLoading, error } = useAvailability(
    dateRange.start,
    dateRange.end,
    duration,
    checkedUsers,
    checkedUsers.length > 0
  );

  // 切換使用者選取
  const toggleUser = (email: string) => {
    setCheckedUsers((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  // 全選/取消全選
  const toggleAllUsers = () => {
    if (checkedUsers.length === users.length) {
      setCheckedUsers([]);
    } else {
      setCheckedUsers(users.map((u) => u.email));
    }
  };

  // 格式化時段顯示
  const formatSlot = (slot: AvailabilitySlot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const dateStr = format(start, 'M/d (EEEE)', { locale: zhTW });
    const timeStr = `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    return { dateStr, timeStr };
  };

  // 按日期分組時段
  const groupedSlots = useMemo(() => {
    if (!data?.slots) return {};
    const groups: Record<string, AvailabilitySlot[]> = {};
    data.slots.forEach((slot) => {
      const dateKey = format(new Date(slot.start), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
    });
    return groups;
  }, [data?.slots]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">尋找共同空檔</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">找出所有人都有空的時段</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 設定區 */}
        <div className="px-6 py-4 space-y-4 border-b border-gray-100 dark:border-gray-800">
          {/* 參與者選擇 */}
          <div className="relative">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
              <Users className="w-4 h-4" />
              參與者
            </label>
            <button
              type="button"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-800"
            >
              <span className="text-gray-700 dark:text-gray-200">
                {checkedUsers.length === 0
                  ? '選擇參與者'
                  : `已選擇 ${checkedUsers.length} 人`}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                  showUserDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showUserDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={toggleAllUsers}
                  className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-gray-700"
                >
                  {checkedUsers.length === users.length ? '取消全選' : '全選'}
                </button>
                {users.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => toggleUser(user.email)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: checkedUsers.includes(user.email)
                          ? userColorMap[user.email] || '#1a73e8'
                          : 'transparent',
                        borderColor: userColorMap[user.email] || '#1a73e8',
                      }}
                    >
                      {checkedUsers.includes(user.email) && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{user.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 會議時長 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              會議時長
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    duration === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 日期範圍 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              查詢範圍
            </label>
            <div className="flex gap-2 flex-wrap">
              {DATE_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDaysAhead(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    daysAhead === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 結果區 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {checkedUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>請先選擇參與者</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">正在搜尋可用時段...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500 dark:text-red-400">
              <p>查詢失敗，請稍後再試</p>
            </div>
          ) : Object.keys(groupedSlots).length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>在此範圍內找不到共同空檔</p>
              <p className="text-sm mt-1">試試延長查詢範圍或減少參與者</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                找到 {data?.slots?.length || 0} 個可用時段
              </p>
              {Object.entries(groupedSlots).map(([dateKey, slots]) => (
                <div key={dateKey}>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    {format(new Date(dateKey), 'M月d日 (EEEE)', { locale: zhTW })}
                  </h3>
                  <div className="grid gap-2">
                    {slots.map((slot, idx) => {
                      const { timeStr } = formatSlot(slot);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-gray-800 dark:text-gray-100 font-medium">{timeStr}</span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {slot.durationMinutes} 分鐘
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              按 <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">F</kbd> 快速開啟
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityFinder;
