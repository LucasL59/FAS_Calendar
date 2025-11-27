/**
 * 事件詳情彈窗元件
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, MapPin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { CalendarEvent, EventAnchorRect } from '../types/calendar';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  highlightColor?: string;
  anchorRect?: EventAnchorRect | null;
}

// 狀態對照表
const showAsLabels: Record<string, string> = {
  free: '空閒',
  tentative: '暫定',
  busy: '忙碌',
  oof: '外出',
  workingElsewhere: '在其他地方工作',
  unknown: '未知',
};

export function EventDetailModal({ event, onClose, highlightColor = '#1a73e8', anchorRect }: EventDetailModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [animateIn, setAnimateIn] = useState(false);

  useLayoutEffect(() => {
    if (!event) return;
    const updateSize = () => {
      if (cardRef.current) {
        setCardSize({
          width: cardRef.current.offsetWidth,
          height: cardRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [event]);

  useEffect(() => {
    if (event) {
      setAnimateIn(true);
      return;
    }
    setAnimateIn(false);
  }, [event]);

  useEffect(() => {
    if (!event) return;
    const handlePointerDown = (pointerEvent: PointerEvent) => {
      const target = pointerEvent.target as HTMLElement | null;
      if (!target) return;
      if (cardRef.current?.contains(target)) return;
      if (target.closest('.fc-daygrid-event')) return;
      if (target.closest('.custom-more-popover')) return;
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [event, onClose]);

  useEffect(() => {
    if (!event) return;
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event, onClose]);

  const positionStyle = useMemo(() => {
    if (!event) return {};
    if (!anchorRect || typeof window === 'undefined') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      } as const;
    }

    const viewportPadding = 16;
    const gap = 12;
    const width = cardSize.width || 360;
    const height = cardSize.height || 320;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const roomRight = viewportWidth - anchorRect.right - viewportPadding;
    const roomLeft = anchorRect.left - viewportPadding;
    const canFitRight = roomRight >= width + gap;
    const canFitLeft = roomLeft >= width + gap;

    let left: number;
    if (canFitRight || (!canFitLeft && roomRight >= roomLeft)) {
      left = anchorRect.right + gap;
    } else {
      left = anchorRect.left - width - gap;
    }

    if (left < viewportPadding) {
      left = viewportPadding;
    } else if (left + width + viewportPadding > viewportWidth) {
      left = viewportWidth - width - viewportPadding;
    }

    let top = anchorRect.top;
    if (top + height + viewportPadding > viewportHeight) {
      top = viewportHeight - height - viewportPadding;
    }
    if (top < viewportPadding) {
      top = viewportPadding;
    }

    return {
      top,
      left,
    } as const;
  }, [anchorRect, cardSize, event]);

  if (!event) return null;

  // 格式化時間
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd (EEEE) HH:mm', {
        locale: zhTW,
      });
    } catch {
      return dateString;
    }
  };

  const isAnchored = Boolean(anchorRect);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 背景遮罩：僅在置中顯示，避免阻擋點擊其它事件 */}
      {!isAnchored && (
        <button
          type="button"
          className="absolute inset-0 bg-black/50 cursor-auto pointer-events-auto"
          onClick={onClose}
          aria-label="關閉事件詳細資訊"
        />
      )}

      {/* 彈窗內容 */}
      <div
        ref={cardRef}
        className={`absolute bg-white rounded-2xl shadow-2xl w-[min(360px,calc(100vw-32px))] overflow-hidden pointer-events-auto event-detail-card ${
          isAnchored ? 'origin-top-left anchored' : ''
        } ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={positionStyle}
      >
        {/* 標題列 */}
        <div
          className="text-white px-6 py-4"
          style={{ backgroundColor: highlightColor }}
        >
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold pr-8">{event.subject}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 內容 */}
        <div className="px-6 py-4 space-y-4">
          {/* 使用者 */}
          <div className="flex items-center gap-3 text-gray-700">
            <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <div className="font-medium">{event.userName}</div>
              <div className="text-sm text-gray-500">{event.userEmail}</div>
            </div>
          </div>

          {/* 時間 */}
          <div className="flex items-start gap-3 text-gray-700">
            <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <div>{formatDateTime(event.start.dateTime)}</div>
              <div className="text-gray-400">至</div>
              <div>{formatDateTime(event.end.dateTime)}</div>
              {event.isAllDay && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  全天事件
                </span>
              )}
            </div>
          </div>

          {/* 地點 */}
          {event.location?.displayName && (
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span>{event.location.displayName}</span>
            </div>
          )}

          {/* 狀態 */}
          <div className="flex items-center gap-3">
            <div
              className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${event.showAs === 'busy' ? 'bg-red-100 text-red-700' : ''}
                ${event.showAs === 'tentative' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${event.showAs === 'free' ? 'bg-green-100 text-green-700' : ''}
                ${event.showAs === 'oof' ? 'bg-purple-100 text-purple-700' : ''}
                ${event.showAs === 'workingElsewhere' ? 'bg-blue-100 text-blue-700' : ''}
                ${event.showAs === 'unknown' ? 'bg-gray-100 text-gray-700' : ''}
              `}
            >
              {showAsLabels[event.showAs] || event.showAs}
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full btn btn-secondary"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventDetailModal;
