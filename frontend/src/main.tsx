import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// 建立 React Query 客戶端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 分鐘內視為新鮮資料
      staleTime: 5 * 60 * 1000,
      // 每 5 分鐘自動重新整理
      refetchInterval: 5 * 60 * 1000,
      // 視窗聚焦時重新整理
      refetchOnWindowFocus: true,
      // 重試 3 次
      retry: 3,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
