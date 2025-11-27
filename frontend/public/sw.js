/**
 * FAS Calendar Service Worker
 * 提供離線快取和 PWA 功能
 */

const CACHE_NAME = 'fas-calendar-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/calendar.svg',
  '/manifest.json'
];

// 安裝事件 - 預快取靜態資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 快取靜態資源');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 啟動事件 - 清理舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] 刪除舊快取:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// 請求攔截 - 網路優先策略
self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;

  // API 請求不快取
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功取得網路回應，更新快取
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 網路失敗，嘗試從快取取得
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 若是導航請求，返回首頁
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('離線狀態，無法取得資源', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// 推送通知（未來擴充用）
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '您有新的行事曆更新',
    icon: '/calendar.svg',
    badge: '/calendar.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FAS Calendar', options)
  );
});

// 通知點擊
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
