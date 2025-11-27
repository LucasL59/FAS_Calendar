/**
 * 使用者選擇器元件
 * 顯示使用者清單，允許勾選要顯示的使用者
 */

import { useMemo, useState } from 'react';
import { Check, ChevronDown, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { CalendarEvent, UserInfo } from '../types/calendar';

const PRESET_COLORS: string[] = [
  '#d93025', '#f29900', '#fbbc04', '#188038', '#00a39b', '#1e8efa', '#185abc', '#9334e6',
  '#5f6368', '#ff6d01', '#ffb7b2', '#34a853', '#00acc1', '#4285f4', '#3c4043', '#c5221f',
  '#f4511e', '#f6bf26', '#33b679', '#0b8043', '#039be5', '#3f51b5', '#8e24aa', '#a79b8e',
];

interface UserSelectorProps {
  users: UserInfo[];
  selectedUsers: string[];
  onSelectionChange: (selectedUsers: string[]) => void;
  showHolidays?: boolean;
  holidays?: CalendarEvent[];
  onToggleHolidays?: () => void;
  showLunar?: boolean;
  onToggleLunar?: () => void;
  userColorOverrides?: Record<string, string>;
  onUserColorChange?: (email: string, color: string) => void;
}

export function UserSelector({
  users,
  selectedUsers,
  onSelectionChange,
  showHolidays = true,
  holidays = [],
  onToggleHolidays,
  showLunar = true,
  onToggleLunar,
  userColorOverrides = {},
  onUserColorChange,
}: UserSelectorProps) {
  const [isTeamCollapsed, setIsTeamCollapsed] = useState(false);
  const [isPersonalCollapsed, setIsPersonalCollapsed] = useState(false);
  const [colorMenuUser, setColorMenuUser] = useState<string | null>(null);
  const [customColorTarget, setCustomColorTarget] = useState<string | null>(null);
  const [customColorDraft, setCustomColorDraft] = useState<string>('#1a73e8');

  // 是否全選
  const isAllSelected = useMemo(
    () => selectedUsers.length === users.length,
    [selectedUsers.length, users.length]
  );

  // 切換單一使用者
  const toggleUser = (email: string) => {
    if (selectedUsers.includes(email)) {
      onSelectionChange(selectedUsers.filter((e) => e !== email));
    } else {
      onSelectionChange([...selectedUsers, email]);
    }
  };

  // 全選/取消全選
  const toggleAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(users.map((u) => u.email));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="font-medium text-sm text-gray-600 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsTeamCollapsed((prev) => !prev)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="切換團隊成員收合"
          >
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${isTeamCollapsed ? '-rotate-90' : ''}`}
            />
          </button>
          團隊成員
        </h3>
        <button
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800 transition-opacity px-2 py-1 rounded"
        >
          {isAllSelected ? '取消全選' : '全選'}
        </button>
      </div>

      {!isTeamCollapsed && (
        <div className="space-y-0.5">
          {users.map((user) => {
            const isSelected = selectedUsers.includes(user.email);
            const currentColor = userColorOverrides[user.email] ?? user.color;

            return (
              <div
                key={user.email}
                className="flex items-center gap-3 px-3 py-1.5 rounded-r-full cursor-pointer hover:bg-gray-100 transition-colors text-sm relative"
                role="button"
                tabIndex={0}
                onClick={() => toggleUser(user.email)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleUser(user.email);
                  }
                }}
              >
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0"
                  style={{
                    backgroundColor: isSelected ? currentColor : 'transparent',
                    borderColor: currentColor,
                  }}
                >
                  {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`truncate text-gray-700 ${isSelected ? 'font-medium' : ''}`}>
                    {user.displayName}
                  </div>
                </div>

                {onUserColorChange && (
                  <button
                    type="button"
                    aria-label="調整顏色"
                    className="ml-auto p-1 rounded-full hover:bg-gray-200 text-gray-500"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setColorMenuUser((prev) => (prev === user.email ? null : user.email));
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}

                {onUserColorChange && colorMenuUser === user.email && (
                  <div
                    className="absolute right-0 top-11 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl w-48 p-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="text-xs text-gray-500 mb-2">選擇顏色</div>
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_COLORS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`w-6 h-6 rounded-full border border-white/70 shadow-inner ${
                            preset === currentColor ? 'ring-2 ring-offset-2 ring-gray-300' : ''
                          }`}
                          style={{ backgroundColor: preset }}
                          aria-label={`套用顏色 ${preset}`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onUserColorChange(user.email, preset);
                            setColorMenuUser(null);
                          }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-3 w-full text-xs text-blue-600 hover:text-blue-800 py-1 rounded-full hover:bg-blue-50"
                      onClick={() => {
                        setCustomColorTarget(user.email);
                        setCustomColorDraft(currentColor);
                        setColorMenuUser(null);
                      }}
                    >
                      自訂顏色…
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          尚無使用者資料
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="font-medium text-sm text-gray-600 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPersonalCollapsed((prev) => !prev)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="切換其他日曆收合"
            >
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${isPersonalCollapsed ? '-rotate-90' : ''}`}
              />
            </button>
            其他日曆
          </h3>
        </div>

        {!isPersonalCollapsed && onToggleHolidays && (
          <label
            className="flex items-center gap-3 px-3 py-1.5 rounded-r-full cursor-pointer hover:bg-gray-100 transition-colors text-sm"
            onClick={onToggleHolidays}
          >
            <div
              className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 border-emerald-500"
              style={{ backgroundColor: showHolidays ? '#10b981' : 'transparent' }}
            >
              {showHolidays && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
            <div className="flex-1 min-w-0 text-gray-700 font-medium">台灣節日</div>
          </label>
        )}

        {!isPersonalCollapsed && onToggleLunar && (
          <label
            className="flex items-center gap-3 px-3 py-1.5 rounded-r-full cursor-pointer hover:bg-gray-100 transition-colors text-sm"
            onClick={onToggleLunar}
          >
            <div
              className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 border-amber-500"
              style={{ backgroundColor: showLunar ? '#f59e0b' : 'transparent' }}
            >
              {showLunar && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
            <div className="flex-1 min-w-0 text-gray-700 font-medium">農曆日期</div>
          </label>
        )}

        {!isPersonalCollapsed && showHolidays && holidays.length > 0 && (
          <div className="mt-2 pl-10 pr-2 space-y-1">
            {holidays.slice(0, 5).map((holiday) => (
              <div
                key={holiday.id}
                className="text-xs text-gray-500 flex gap-2 items-center py-0.5 hover:text-gray-800 transition-colors"
              >
                <span className="font-medium w-10 text-right flex-shrink-0">
                  {format(new Date(holiday.start.dateTime), 'M/d', { locale: zhTW })}
                </span>
                <span className="truncate" title={holiday.subject}>
                  {holiday.subject}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {onUserColorChange && customColorTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setCustomColorTarget(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="text-sm font-medium text-gray-700 mb-3">自訂顏色</h4>
            <input
              type="color"
              value={customColorDraft}
              onChange={(event) => setCustomColorDraft(event.target.value)}
              className="w-full h-12 border border-gray-200 rounded-lg"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setCustomColorTarget(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="px-5 py-2 rounded-full text-sm text-white"
                style={{ backgroundColor: customColorDraft }}
                onClick={() => {
                  onUserColorChange(customColorTarget, customColorDraft);
                  setCustomColorTarget(null);
                }}
              >
                套用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSelector;
