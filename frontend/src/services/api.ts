/**
 * API 服務
 * 負責與後端 API 通訊
 */

import axios from 'axios';
import type {
  CalendarEventResponse,
  AvailabilityResponse,
  SyncStatus,
  UserInfo,
} from '../types/calendar';

// API 基礎 URL (開發環境使用 proxy，生產環境使用環境變數)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// 建立 axios 實例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器 (可加入 API Key)
apiClient.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});

// 回應攔截器 (統一錯誤處理)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * 行事曆 API
 */
export const calendarApi = {
  /**
   * 取得行事曆事件
   * @param start 開始日期
   * @param end 結束日期
   * @param users 使用者信箱 (選填)
   */
  getEvents: async (
    start?: Date,
    end?: Date,
    users?: string[]
  ): Promise<CalendarEventResponse> => {
    const params = new URLSearchParams();
    if (start) params.append('start', start.toISOString());
    if (end) params.append('end', end.toISOString());
    if (users && users.length > 0) params.append('users', users.join(','));

    const response = await apiClient.get<CalendarEventResponse>(
      `/calendars/events?${params}`
    );
    return response.data;
  },

  /**
   * 查詢空檔時段
   * @param start 開始日期
   * @param end 結束日期
   * @param duration 會議時長 (分鐘)
   * @param users 使用者信箱 (選填)
   */
  getAvailability: async (
    start: Date,
    end: Date,
    duration: number = 60,
    users?: string[]
  ): Promise<AvailabilityResponse> => {
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      duration: duration.toString(),
    });
    if (users && users.length > 0) params.append('users', users.join(','));

    const response = await apiClient.get<AvailabilityResponse>(
      `/calendars/availability?${params}`
    );
    return response.data;
  },

  /**
   * 取得使用者清單
   */
  getUsers: async (): Promise<UserInfo[]> => {
    const response = await apiClient.get<UserInfo[]>('/users');
    return response.data;
  },

  /**
   * 手動觸發同步
   */
  triggerSync: async (): Promise<{ message: string; success: boolean }> => {
    const response = await apiClient.post<{ message: string; success: boolean }>(
      '/sync'
    );
    return response.data;
  },

  /**
   * 取得同步狀態
   */
  getSyncStatus: async (): Promise<SyncStatus> => {
    const response = await apiClient.get<SyncStatus>('/sync/status');
    return response.data;
  },

  /**
   * 健康檢查
   */
  healthCheck: async (): Promise<{
    status: string;
    azure_configured: boolean;
    user_count: number;
    timestamp: string;
  }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default calendarApi;
