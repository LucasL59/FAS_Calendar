/**
 * 同步狀態列 (精簡版)
 */

import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { RefreshCw } from 'lucide-react';
import type { SyncStatus } from '../types/calendar';

interface SyncStatusBarProps {
  syncStatus?: SyncStatus;
  isLoading: boolean;
  onSync: () => void;
  isSyncing: boolean;
}

export function SyncStatusBar({
  syncStatus,
  isLoading,
  onSync,
  isSyncing,
}: SyncStatusBarProps) {
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '尚未同步';
    try {
      return format(new Date(dateString), 'MM/dd HH:mm', { locale: zhTW });
    } catch {
      return '時間格式錯誤';
    }
  };

  const busy = isSyncing || Boolean(syncStatus?.isSyncing);
  const errorMessage = syncStatus?.errorMessage?.trim() || null;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-500">
      <div className="min-w-0" aria-live="polite">
        {isLoading ? (
          <span className="text-gray-400">載入中...</span>
        ) : busy ? (
          <span className="text-blue-600">同步中...</span>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>
              最後同步: {formatTime(syncStatus?.lastSync ?? null)}
            </span>
            {syncStatus?.totalEvents !== undefined && (
              <span className="text-gray-400 tabular-nums">
                ({syncStatus.totalEvents} 事件 / {syncStatus.totalUsers} 人)
              </span>
            )}
          </div>
        )}
        {errorMessage && (
          <p className="mt-0.5 truncate text-xs text-red-600" title={errorMessage}>
            {errorMessage}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onSync}
        disabled={busy}
        aria-label="立即同步"
        aria-busy={busy}
        title={busy ? '同步中' : '立即同步'}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
        {busy ? '同步中' : '立即同步'}
      </button>
    </div>
  );
}

export default SyncStatusBar;
