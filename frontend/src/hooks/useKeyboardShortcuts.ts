/**
 * 鍵盤快捷鍵 Hook
 * 提供 Google 日曆風格的快捷鍵支援
 */

import { useEffect, useCallback } from 'react';
import type { CalendarApi } from '@fullcalendar/core';

interface KeyboardShortcutsOptions {
  calendarApi: CalendarApi | null;
  onViewChange: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek') => void;
  onToggleSidebar?: () => void;
  onOpenAvailabilityFinder?: () => void;
  enabled?: boolean;
}

/**
 * 快捷鍵說明
 * - T: 回到今天
 * - M: 切換月視圖
 * - W: 切換週視圖
 * - D: 切換日視圖
 * - A: 切換列表視圖
 * - ←: 上一個時間範圍
 * - →: 下一個時間範圍
 * - [: 收合/展開側邊欄
 * - F: 開啟空檔查詢
 * - /: 聚焦搜尋框
 * - ?: 顯示快捷鍵說明
 */
export function useKeyboardShortcuts({
  calendarApi,
  onViewChange,
  onToggleSidebar,
  onOpenAvailabilityFinder,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 忽略在輸入框中的按鍵
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // 只有 Escape 可以在輸入框中觸發（用於清除焦點）
        if (event.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // 忽略有修飾鍵的組合（Ctrl/Cmd/Alt）
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 't':
          // 回到今天
          event.preventDefault();
          calendarApi?.today();
          break;

        case 'm':
          // 月視圖
          event.preventDefault();
          onViewChange('dayGridMonth');
          break;

        case 'w':
          // 週視圖
          event.preventDefault();
          onViewChange('timeGridWeek');
          break;

        case 'd':
          // 日視圖
          event.preventDefault();
          onViewChange('timeGridDay');
          break;

        case 'a':
          // 列表視圖
          event.preventDefault();
          onViewChange('listWeek');
          break;

        case 'arrowleft':
          // 上一個時間範圍
          event.preventDefault();
          calendarApi?.prev();
          break;

        case 'arrowright':
          // 下一個時間範圍
          event.preventDefault();
          calendarApi?.next();
          break;

        case '[':
          // 切換側邊欄
          event.preventDefault();
          onToggleSidebar?.();
          break;

        case 'f':
          // 開啟空檔查詢
          event.preventDefault();
          onOpenAvailabilityFinder?.();
          break;

        case '/':
          // 聚焦搜尋框
          event.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder*="搜尋"]'
          );
          searchInput?.focus();
          break;

        default:
          break;
      }
    },
    [calendarApi, onViewChange, onToggleSidebar, onOpenAvailabilityFinder]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

export default useKeyboardShortcuts;
