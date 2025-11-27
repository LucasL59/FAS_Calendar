/**
 * 行事曆資料 Hook
 * 使用 React Query 管理資料獲取與快取
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi } from '../services/api';
import type { DateRange } from '../types/calendar';

/**
 * 取得行事曆事件
 */
export function useCalendarEvents(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['calendarEvents', dateRange?.start, dateRange?.end],
    queryFn: () => calendarApi.getEvents(dateRange?.start, dateRange?.end),
    // 2 分鐘內視為新鮮資料
    staleTime: 2 * 60 * 1000,
    // 每 5 分鐘自動重新整理
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * 取得使用者清單
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => calendarApi.getUsers(),
    // 使用者清單較少變動，快取 10 分鐘
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 取得同步狀態
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: ['syncStatus'],
    queryFn: () => calendarApi.getSyncStatus(),
    // 每 30 秒更新一次
    refetchInterval: 30 * 1000,
  });
}

/**
 * 查詢空檔時段
 */
export function useAvailability(
  start: Date,
  end: Date,
  duration: number = 60,
  users?: string[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['availability', start, end, duration, users],
    queryFn: () => calendarApi.getAvailability(start, end, duration, users),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 手動觸發同步
 */
export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => calendarApi.triggerSync(),
    onSuccess: () => {
      // 同步完成後，重新整理相關資料
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * 健康檢查
 */
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => calendarApi.healthCheck(),
    // 每分鐘檢查一次
    refetchInterval: 60 * 1000,
  });
}
