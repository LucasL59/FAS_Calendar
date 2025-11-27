/**
 * 同步狀態列 (精簡版)
 */

import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
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
}: SyncStatusBarProps) {
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '尚未同步';
    try {
      return format(new Date(dateString), 'MM/dd HH:mm', { locale: zhTW });
    } catch {
      return '時間格式錯誤';
    }
  };

  if (isLoading) {
    return <span className="text-sm text-gray-400">載入中...</span>;
  }

  return (
    <div className="flex items-center gap-3 text-sm text-gray-500">
      {syncStatus?.isSyncing ? (
        <span className="text-blue-600">同步中...</span>
      ) : (
        <>
          <span>
            最後同步: {formatTime(syncStatus?.lastSync ?? null)}
          </span>
          {syncStatus?.totalEvents !== undefined && (
            <span className="text-gray-400">
              ({syncStatus.totalEvents} 事件 / {syncStatus.totalUsers} 人)
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default SyncStatusBar;
