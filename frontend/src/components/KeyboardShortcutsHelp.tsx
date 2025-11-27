/**
 * 鍵盤快捷鍵說明元件
 */

import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'T', description: '回到今天' },
  { key: 'M', description: '切換月視圖' },
  { key: 'W', description: '切換週視圖' },
  { key: 'D', description: '切換日視圖' },
  { key: 'A', description: '切換列表視圖' },
  { key: '←', description: '上一個時間範圍' },
  { key: '→', description: '下一個時間範圍' },
  { key: '[', description: '切換側邊欄' },
  { key: 'F', description: '開啟空檔查詢' },
  { key: '/', description: '聚焦搜尋框' },
  { key: 'Esc', description: '關閉彈窗 / 取消焦點' },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">鍵盤快捷鍵</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 快捷鍵列表 */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                <span className="text-gray-700">{shortcut.description}</span>
                <kbd className="px-2.5 py-1 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono text-gray-700 shadow-sm">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            按 <kbd>?</kbd> 或點擊問號按鈕開啟此說明
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsHelp;
