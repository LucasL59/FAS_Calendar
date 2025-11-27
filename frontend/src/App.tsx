/**
 * FAS Calendar - 團隊行事曆聚合系統 (Google 日曆風格)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Menu, X, Settings, Search, HelpCircle, Clock, Sun, Moon, Monitor } from 'lucide-react';
import { CalendarView } from './components/CalendarView';
import { UserSelector } from './components/UserSelector';
import { MiniMonthCalendar } from './components/MiniMonthCalendar';
import { SyncStatusBar } from './components/SyncStatusBar';
import { EventDetailModal } from './components/EventDetailModal';
import { AvailabilityFinder } from './components/AvailabilityFinder';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import {
  useCalendarEvents,
  useSyncStatus,
  useTriggerSync,
} from './hooks/useCalendarData';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { CalendarEvent, DateRange, EventAnchorRect, UserInfo } from './types/calendar';
import type { CalendarApi } from '@fullcalendar/core';
import { TAIWAN_HOLIDAYS } from '@/data/holidays';

function App() {
  // 狀態管理
  const initialCalendarDate = useMemo(() => new Date(), []);
  const [viewAnchorDate, setViewAnchorDate] = useState<Date>(initialCalendarDate);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [hasUserSelectionInitialized, setHasUserSelectionInitialized] = useState(false);
  const [showHolidays, setShowHolidays] = useState(true); // 預設顯示假日
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [selectedEventColor, setSelectedEventColor] = useState<string | null>(null);
  const [eventAnchorRect, setEventAnchorRect] = useState<EventAnchorRect | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusDate, setFocusDate] = useState<Date | null>(null);
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'>('dayGridMonth');
  const [calendarTitle, setCalendarTitle] = useState(() =>
    initialCalendarDate.toLocaleString('zh-TW', { year: 'numeric', month: 'long' })
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showAvailabilityFinder, setShowAvailabilityFinder] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // 深色模式：'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('fas-calendar:theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const calendarApiRef = useRef<CalendarApi | null>(null);
  const [userColorOverrides, setUserColorOverrides] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('fas-calendar:user-colors');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('無法讀取自訂顏色設定', error);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('fas-calendar:user-colors', JSON.stringify(userColorOverrides));
    } catch (error) {
      console.warn('無法儲存自訂顏色設定', error);
    }
  }, [userColorOverrides]);

  const updateCalendarTitle = useCallback(() => {
    const api = calendarApiRef.current;
    if (api) {
      setCalendarTitle(api.view.title);
    }
  }, []);

  // API Hooks
  const {
    data: calendarData,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useCalendarEvents();

  const { data: syncStatus, isLoading: isLoadingSyncStatus } = useSyncStatus();
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync();

  const users: UserInfo[] = calendarData?.users || [];

  const userColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((user) => {
      map[user.email] = userColorOverrides[user.email] ?? user.color;
    });
    return map;
  }, [users, userColorOverrides]);

  const sidebarMobileClass = sidebarOpen
    ? 'translate-x-0 opacity-100 pointer-events-auto'
    : '-translate-x-full opacity-0 pointer-events-none';

  const desktopGridTemplate = useMemo(
    () => (sidebarOpen ? '288px minmax(0, 1fr)' : 'minmax(0, 1fr)'),
    [sidebarOpen]
  );

  // 初始化全選
  useEffect(() => {
    if (users.length === 0) return;
    if (!hasUserSelectionInitialized) {
      setSelectedUsers(users.map((u) => u.email));
      return;
    }

    // 若使用者已手動選取，只同步保留仍存在的成員
    setSelectedUsers((prev) => prev.filter((email) => users.some((u) => u.email === email)));
  }, [users, hasUserSelectionInitialized]);

  const handleUserSelectionChange = useCallback((emails: string[]) => {
    setSelectedUsers(emails);
    setHasUserSelectionInitialized(true);
  }, []);

  // 事件處理
  const handleDateRangeChange = useCallback((range: DateRange, activeDate?: Date) => {
    const newAnchor = activeDate ?? range.start;
    setViewAnchorDate((prev) => {
      if (prev.getTime() === newAnchor.getTime()) {
        return prev;
      }
      return newAnchor;
    });
    setFocusDate(null);
    updateCalendarTitle();
  }, [updateCalendarTitle]);
  const handleEventClick = useCallback((event: CalendarEvent, anchor?: EventAnchorRect) => {
    setSelectedEvent(event);
    setSelectedEventKey(`${event.userEmail}-${event.id}`);
    setSelectedEventColor(userColorMap[event.userEmail] ?? '#1a73e8');
    setEventAnchorRect(anchor ?? null);
  }, [userColorMap]);
  const handleSync = useCallback(() => triggerSync(), [triggerSync]);
  const toggleHolidays = useCallback(() => setShowHolidays(prev => !prev), []);
  const handleUserColorChange = useCallback((email: string, color: string) => {
    setUserColorOverrides((prev) => ({
      ...prev,
      [email]: color,
    }));
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      setSelectedEventColor(userColorMap[selectedEvent.userEmail] ?? '#1a73e8');
    }
  }, [selectedEvent, userColorMap]);

  // 鍵盤快捷鍵
  useKeyboardShortcuts({
    calendarApi: calendarApiRef.current,
    onViewChange: setCalendarView,
    onToggleSidebar: () => setSidebarOpen((prev) => !prev),
    onOpenAvailabilityFinder: () => setShowAvailabilityFinder(true),
  });

  // 深色模式切換
  useEffect(() => {
    const applyTheme = (mode: 'light' | 'dark' | 'system') => {
      const root = document.documentElement;
      
      if (mode === 'system') {
        // 跟隨系統
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', mode === 'dark');
      }
      
      localStorage.setItem('fas-calendar:theme', mode);
    };
    
    applyTheme(themeMode);
    
    // 監聽系統主題變化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const sidebarHolidays = useMemo<CalendarEvent[]>(() => {
    const monthStart = new Date(viewAnchorDate.getFullYear(), viewAnchorDate.getMonth(), 1);
    const monthEnd = new Date(viewAnchorDate.getFullYear(), viewAnchorDate.getMonth() + 1, 0);
    return TAIWAN_HOLIDAYS.filter((holiday) => {
      const date = new Date(holiday.start.dateTime);
      return date >= monthStart && date <= monthEnd;
    });
  }, [viewAnchorDate]);

  // 搜尋篩選邏輯
  const filteredCalendars = useMemo(() => {
    if (!calendarData?.calendars || !searchTerm.trim()) {
      return calendarData?.calendars || {};
    }
    const term = searchTerm.toLowerCase().trim();
    const filtered: Record<string, CalendarEvent[]> = {};
    
    Object.entries(calendarData.calendars).forEach(([email, events]) => {
      const user = users.find((u) => u.email === email);
      const userName = user?.displayName?.toLowerCase() || '';
      
      const matchedEvents = events.filter((event) => {
        // 搜尋標題、使用者名稱、地點
        const matchSubject = event.subject.toLowerCase().includes(term);
        const matchUser = userName.includes(term);
        const matchLocation = event.location?.displayName?.toLowerCase().includes(term);
        return matchSubject || matchUser || matchLocation;
      });
      
      if (matchedEvents.length > 0) {
        filtered[email] = matchedEvents;
      }
    });
    
    return filtered;
  }, [calendarData?.calendars, searchTerm, users]);

  const sidebarContent = useMemo(() => (
    <>
      <div className="px-4 mb-6">
        <MiniMonthCalendar
          anchorDate={viewAnchorDate}
          selectedDate={focusDate ?? viewAnchorDate}
          onMonthChange={(date) => {
            setViewAnchorDate(date);
            setFocusDate(date);
          }}
          onDateSelect={(date) => {
            setViewAnchorDate(date);
            setFocusDate(date);
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 custom-scrollbar">
        <UserSelector
          users={users}
          selectedUsers={selectedUsers}
          onSelectionChange={handleUserSelectionChange}
          holidays={sidebarHolidays}
          showHolidays={showHolidays}
          onToggleHolidays={toggleHolidays}
          userColorOverrides={userColorOverrides}
          onUserColorChange={handleUserColorChange}
        />
      </div>
    </>
  ), [
    users,
    selectedUsers,
    handleUserSelectionChange,
    sidebarHolidays,
    showHolidays,
    toggleHolidays,
    viewAnchorDate,
    focusDate,
    userColorOverrides,
    handleUserColorChange,
  ]);

  // 錯誤畫面
  if (eventsError) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center font-google-sans">
        <div className="text-center max-w-md mx-auto px-4 bg-white p-8 rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">無法連接伺服器</h2>
          <p className="text-gray-600 mb-6">請確認後端服務是否正常運行</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            重新整理
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-50 text-gray-900 flex flex-col font-google-sans">
      {/* Google 風格頂部導航列 */}
      <header className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-gray-200 bg-white z-20 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-[230px]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
            aria-label="主選單"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 select-none">
            {/* Google Calendar Icon 模擬 */}
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center shadow-sm overflow-hidden relative">
                <div className="w-full h-3 bg-red-500 absolute top-0"></div>
                <span className="text-xs font-bold text-gray-600 mt-2">31</span>
            </div>
            <span className="text-[22px] text-gray-600 leading-tight tracking-tight pl-1">
              Calendar <span className="text-gray-400 text-sm block -mt-1">Team Edition</span>
            </span>
          </div>
        </div>

        {/* 中間工具列 */}
        <div className="flex-1 flex items-center justify-center gap-3 px-4 min-w-0 flex-wrap xl:flex-nowrap">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm bg-white">
            <button
              onClick={() => calendarApiRef.current?.prev()}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="上一頁"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              onClick={() => calendarApiRef.current?.next()}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="下一頁"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <button
              onClick={() => calendarApiRef.current?.today()}
              className="px-4 py-1.5 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50"
            >
              今天
            </button>
          </div>
          <div className="text-2xl font-medium text-gray-700 min-w-[180px] text-center">
            {calendarTitle}
          </div>
          <div className="flex rounded-full border border-gray-200 overflow-hidden">
            {([
              { key: 'dayGridMonth', label: '月' },
              { key: 'timeGridWeek', label: '週' },
              { key: 'timeGridDay', label: '日' },
              { key: 'listWeek', label: '列表' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCalendarView(key)}
                className={`px-4 py-1.5 text-sm ${
                  calendarView === key
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 右側搜尋＋工具區 */}
        <div className="flex items-center gap-3 min-w-[260px] justify-end flex-wrap lg:flex-nowrap">
          <div className="flex items-center gap-3 bg-gray-100 rounded-full px-4 py-1.5 w-full md:w-72 h-11 focus-within:bg-white focus-within:shadow-md transition-all group order-1 md:order-none">
            <Search className="w-5 h-5 text-gray-500 group-focus-within:text-gray-700" />
            <input
              type="text"
              placeholder="搜尋事件、人員或地點..."
              className="bg-transparent border-none outline-none w-full text-gray-700 placeholder-gray-500 h-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="清除搜尋"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
          <div className="hidden lg:block">
            <SyncStatusBar
              syncStatus={syncStatus}
              isLoading={isLoadingSyncStatus}
              onSync={handleSync}
              isSyncing={isSyncing}
            />
          </div>
          <div className="hidden lg:block h-8 w-[1px] bg-gray-200 dark:bg-gray-700" />
          
          {/* 尋找空檔按鈕 */}
          <button 
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm transition-colors"
            onClick={() => setShowAvailabilityFinder(true)}
            title="尋找共同空檔 (F)"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden md:inline">尋找空檔</span>
          </button>
          
          {/* 主題切換 */}
          <div className="relative">
            <button 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title="切換主題"
            >
              {themeMode === 'dark' ? <Moon className="w-5 h-5" /> : 
               themeMode === 'light' ? <Sun className="w-5 h-5" /> : 
               <Monitor className="w-5 h-5" />}
            </button>
            
            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <button
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeMode === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => { setThemeMode('light'); setShowThemeMenu(false); }}
                >
                  <Sun className="w-4 h-4" />
                  淺色模式
                </button>
                <button
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeMode === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => { setThemeMode('dark'); setShowThemeMenu(false); }}
                >
                  <Moon className="w-4 h-4" />
                  深色模式
                </button>
                <button
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeMode === 'system' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => { setThemeMode('system'); setShowThemeMenu(false); }}
                >
                  <Monitor className="w-4 h-4" />
                  跟隨系統
                </button>
              </div>
            )}
          </div>
          
          <button 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400"
            onClick={() => setShowKeyboardHelp(true)}
            title="鍵盤快捷鍵說明"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
            <Settings className="w-5 h-5" />
          </button>
          <div className="ml-2 w-8 h-8 bg-purple-600 rounded-full text-white flex items-center justify-center text-sm font-medium cursor-pointer hover:ring-4 ring-gray-100 transition-all">
            A
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
      <div
        className="flex-1 flex flex-col lg:grid overflow-hidden relative transition-[grid-template-columns] duration-300"
        style={{ gridTemplateColumns: desktopGridTemplate }}
      >
        {/* 桌面側邊欄 */}
        {sidebarOpen && (
          <aside className="hidden lg:flex lg:flex-col bg-white z-10 overflow-hidden border-r border-gray-200">
            {sidebarContent}
          </aside>
        )}

        {/* 日曆主視圖 */}
        <main
          className="flex-1 flex flex-col bg-white min-h-0"
          style={{ gridColumnStart: sidebarOpen ? 2 : 1 }}
        >
          <div className="lg:hidden border-b border-gray-200 bg-white">
            <SyncStatusBar
              syncStatus={syncStatus}
              isLoading={isLoadingSyncStatus}
              onSync={handleSync}
              isSyncing={isSyncing}
            />
          </div>
          {isLoadingEvents && !calendarData ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-4">
                 <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full animate-ping"></div>
                 <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-gray-500 font-medium animate-pulse">正在同步行事曆...</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <CalendarView
                calendars={filteredCalendars}
                users={users}
                selectedUsers={selectedUsers}
                holidays={TAIWAN_HOLIDAYS}
                showHolidays={showHolidays}
                initialDate={initialCalendarDate}
                focusDate={focusDate ?? undefined}
                view={calendarView}
                colorOverrides={userColorOverrides}
                selectedEventId={selectedEventKey ?? undefined}
                onDateRangeChange={handleDateRangeChange}
                onEventClick={handleEventClick}
                onCalendarReady={(api) => {
                  calendarApiRef.current = api;
                  updateCalendarTitle();
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* 行動側邊欄 */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-20"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className={`lg:hidden transform fixed top-16 bottom-0 w-72 bg-white z-30 border-r border-gray-200 pt-4 pb-6 flex flex-col transition-transform transition-opacity duration-300 ease-in-out ${sidebarMobileClass}`}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* 事件詳情 */}
      <EventDetailModal
        event={selectedEvent}
        highlightColor={selectedEventColor ?? '#1a73e8'}
        anchorRect={eventAnchorRect}
        onClose={() => {
          setSelectedEvent(null);
          setSelectedEventKey(null);
          setSelectedEventColor(null);
          setEventAnchorRect(null);
        }}
      />

      {/* 空檔查詢 */}
      {showAvailabilityFinder && (
        <AvailabilityFinder
          users={users}
          selectedUsers={selectedUsers}
          onClose={() => setShowAvailabilityFinder(false)}
          userColorMap={userColorMap}
        />
      )}

      {/* 快捷鍵說明 */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  );
}

export default App;
