/**
 * FAS Calendar - 團隊行事曆聚合系統 (Google 日曆風格)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Menu, X, Settings, Search, HelpCircle, Clock, Sun, Moon, Monitor, Plus, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [showLunar, setShowLunar] = useState(() => {
    const saved = localStorage.getItem('fas-calendar:show-lunar');
    return saved !== 'false'; // 預設開啟
  });
  const [showOncall, setShowOncall] = useState(() => {
    const saved = localStorage.getItem('fas-calendar:show-oncall');
    return saved !== 'false';
  });
  
  // 深色模式：'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('fas-calendar:theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    localStorage.setItem('fas-calendar:show-lunar', String(showLunar));
  }, [showLunar]);

  useEffect(() => {
    localStorage.setItem('fas-calendar:show-oncall', String(showOncall));
  }, [showOncall]);

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
  const oncallEvents = calendarData?.oncallEvents ?? [];

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
    const rangeMidpoint = new Date((range.start.getTime() + range.end.getTime()) / 2);
    const newAnchor = activeDate ?? rangeMidpoint;
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
  const toggleOncall = useCallback(() => setShowOncall(prev => !prev), []);
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

  const sidebarOncallEvents = useMemo<CalendarEvent[]>(() => {
    if (!oncallEvents.length) return [];
    const monthStart = new Date(viewAnchorDate.getFullYear(), viewAnchorDate.getMonth(), 1);
    const monthEnd = new Date(viewAnchorDate.getFullYear(), viewAnchorDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return oncallEvents.filter((event) => {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      return end >= monthStart && start <= monthEnd;
    });
  }, [oncallEvents, viewAnchorDate]);

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
          showLunar={showLunar}
          onToggleLunar={() => setShowLunar(prev => !prev)}
          showOncall={showOncall}
          onToggleOncall={toggleOncall}
          oncallEvents={sidebarOncallEvents}
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
    showLunar,
    showOncall,
    toggleOncall,
    sidebarOncallEvents,
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
      <header className="h-14 px-2 sm:px-4 flex items-center border-b border-gray-200 bg-white z-20 flex-shrink-0">
        {/* 左側 Logo 區 - 固定寬度對應側邊欄 */}
        <div className="flex items-center gap-2 flex-shrink-0 w-[60px] sm:w-[200px] lg:w-[256px]">
          {/* 漢堡選單 */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
            aria-label="主選單"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* Logo - FAS 團隊日曆垂直排列 */}
          <div className="hidden sm:flex items-center gap-2 select-none">
            <div className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center overflow-hidden relative shadow-sm">
              <div className="w-full h-2.5 bg-red-500 absolute top-0"></div>
              <span className="text-[11px] font-bold text-gray-600 mt-1.5">{new Date().getDate()}</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold text-gray-700">FAS</span>
              <span className="text-xs text-gray-400">團隊日曆</span>
            </div>
          </div>
        </div>
        
        {/* 中間導航區 - 今天、箭頭、月份標題 */}
        <div className="flex items-center gap-1 flex-1">
          {/* 今天按鈕 - 圓角 */}
          <button
            onClick={() => calendarApiRef.current?.today()}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-colors border border-gray-300"
          >
            今天
          </button>
          
          {/* 前後導航箭頭 */}
          <button
            onClick={() => calendarApiRef.current?.prev()}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="上一頁"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => calendarApiRef.current?.next()}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="下一頁"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* 月份標題 */}
          <div className="text-lg sm:text-xl font-normal text-gray-800 ml-3 whitespace-nowrap">
            {calendarTitle}
          </div>
        </div>

        {/* 右側工具區 */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 同步狀態 - 垂直排列縮小 */}
          <div className="hidden md:flex flex-col items-end text-[10px] text-gray-400 leading-tight mr-1">
            <span>{syncStatus?.lastSync ? new Date(syncStatus.lastSync).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
            <span>{syncStatus?.totalEvents ?? 0}事件/{syncStatus?.totalUsers ?? 0}人</span>
          </div>
          
          {/* 搜尋框 - 可展開收合 */}
          <div className="relative">
            {isSearchExpanded ? (
              <div className="flex items-center bg-gray-100 rounded-full pl-3 pr-2 h-10 w-48 sm:w-56 focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="搜尋"
                  className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-500 ml-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onBlur={() => {
                    if (!searchTerm) setIsSearchExpanded(false);
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  aria-label="關閉搜尋"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsSearchExpanded(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="搜尋"
              >
                <Search className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
          
          {/* 視圖切換下拉選單 - 圓角 */}
          <div className="relative">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full border border-gray-300 transition-colors"
            >
              {{ dayGridMonth: '月', timeGridWeek: '週', timeGridDay: '日', listWeek: '列表' }[calendarView]}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showViewMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowViewMenu(false)} />
                <div className="absolute right-0 mt-1 w-28 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  {([
                    { key: 'dayGridMonth', label: '月' },
                    { key: 'timeGridWeek', label: '週' },
                    { key: 'timeGridDay', label: '日' },
                    { key: 'listWeek', label: '列表' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setCalendarView(key); setShowViewMenu(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                        calendarView === key ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* 建立事件按鈕 */}
          <button 
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium shadow-sm hover:shadow transition-all"
            onClick={() => {
              // 開啟 Outlook Web 新增事件頁面
              window.open('https://outlook.office.com/calendar/0/deeplink/compose', '_blank');
            }}
            title="建立新事件"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">建立</span>
          </button>
          
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
                oncallEvents={oncallEvents}
                showOncall={showOncall}
                showLunar={showLunar}
                initialDate={viewAnchorDate}
                focusDate={focusDate ?? undefined}
                view={calendarView}
                colorOverrides={userColorOverrides}
                selectedEventId={selectedEventKey ?? undefined}
                onDateRangeChange={handleDateRangeChange}
                onEventClick={handleEventClick}
                onCalendarReady={(api) => {
                  calendarApiRef.current = api;
                  const activeDate = api.getDate();
                  setViewAnchorDate(activeDate);
                  setFocusDate(activeDate);
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
