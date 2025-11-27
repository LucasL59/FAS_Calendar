# FAS Calendar - 團隊行事曆聚合系統

## 專案簡介

透過 Microsoft Graph API 整合多位同事的 Outlook 行事曆，提供類似 Google Calendar 的直覺視覺化介面，讓團隊成員無需登入即可一目瞭然地查看所有人的行程安排。

## 功能特色

- ✅ **免登入瀏覽**：同事開啟網頁即可查看所有人行程
- ✅ **自動同步**：每 10 分鐘自動同步 Outlook 行事曆
- ✅ **多視圖切換**：日/週/月/議程視圖
- ✅ **顏色編碼**：每位同事有專屬顏色，易於辨識
- ✅ **空檔查詢**：快速找出所有人都有空的時段
- ✅ **響應式設計**：支援桌面與行動裝置

## 技術架構

```
┌─────────────────────────────────────────────────────┐
│           使用者瀏覽器 (免登入)                      │
│                    ↓                                │
│         React + FullCalendar 前端                   │
└─────────────────────────────────────────────────────┘
                     ↓ HTTPS
┌─────────────────────────────────────────────────────┐
│              FastAPI 後端服務                        │
│  ┌───────────────────────────────────────────┐     │
│  │  REST API                                  │     │
│  │  - GET /api/calendars/events              │     │
│  │  - GET /api/calendars/availability        │     │
│  │  - GET /api/users                         │     │
│  │  - POST /api/sync (手動同步)              │     │
│  └───────────────────────────────────────────┘     │
│                    ↓                                │
│  ┌───────────────────────────────────────────┐     │
│  │  APScheduler (背景同步排程)                │     │
│  │  - 每 10 分鐘自動同步                      │     │
│  └───────────────────────────────────────────┘     │
│                    ↓                                │
│  ┌───────────────────────────────────────────┐     │
│  │  SQLite + 記憶體快取                       │     │
│  │  - 儲存行事曆資料                          │     │
│  │  - 降低 API 呼叫次數                       │     │
│  └───────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
                     ↓
        Microsoft Graph API (Application Permission)
                     ↓
             Microsoft 365 (Outlook Calendar)
```

## 快速開始

### 前置需求

1. Python 3.11+
2. Node.js 18+
3. Azure AD 應用程式註冊 (Application Permission)

### Azure AD 設定

1. 登入 [Azure Portal](https://portal.azure.com)
2. 前往 **Microsoft Entra ID** > **應用程式註冊** > **新增註冊**
3. 設定：
   - 名稱：`FAS Calendar`
   - 支援的帳戶類型：`僅限此組織目錄中的帳戶`
4. 建立後，前往 **憑證及祕密** > **新增用戶端密碼**
5. 前往 **API 權限** > **新增權限** > **Microsoft Graph** > **應用程式權限**
   - 新增：`Calendars.Read`、`User.Read.All`
6. 點擊 **代表組織授予管理員同意**
7. 記錄以下資訊：
   - Tenant ID
   - Client ID
   - Client Secret

### 後端啟動

```bash
cd backend

# 建立虛擬環境
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# 安裝依賴
pip install -r requirements.txt

# 設定環境變數 (複製 .env.example 為 .env 並填入)
copy .env.example .env

# 啟動服務
uvicorn app.main:app --reload --port 8000
```

### 前端啟動

```bash
cd frontend

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

### 存取網頁

- 前端：http://localhost:5173
- 後端 API 文件：http://localhost:8000/docs

## 環境變數說明

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `AZURE_TENANT_ID` | Azure AD 租戶 ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_CLIENT_ID` | 應用程式 (用戶端) ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_CLIENT_SECRET` | 用戶端密碼 | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `USER_EMAILS` | 要同步的使用者信箱 (逗號分隔) | `user1@company.com,user2@company.com` |
| `SYNC_INTERVAL_MINUTES` | 同步間隔 (分鐘) | `10` |
| `API_KEY` | API 存取金鑰 (選用) | `your-secret-api-key` |

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/calendars/events` | 取得所有人的行事曆事件 |
| `GET` | `/api/calendars/availability` | 查詢空檔時段 |
| `GET` | `/api/users` | 取得使用者清單 |
| `POST` | `/api/sync` | 手動觸發同步 |
| `GET` | `/api/health` | 健康檢查 |

## 專案結構

```
FAS_Calendar/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 主程式
│   │   ├── config.py            # 設定管理
│   │   ├── services/
│   │   │   ├── graph_service.py # Microsoft Graph API 服務
│   │   │   ├── cache_service.py # 快取服務
│   │   │   └── sync_service.py  # 同步排程服務
│   │   ├── routers/
│   │   │   └── calendars.py     # API 路由
│   │   └── models/
│   │       └── calendar.py      # Pydantic 資料模型
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CalendarView.tsx
│   │   │   ├── UserSelector.tsx
│   │   │   └── EventDetail.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── calendar.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 安全性考量

1. **API Key 驗證**：後端 API 需提供有效的 API Key
2. **HTTPS**：生產環境強制使用 HTTPS
3. **CORS 設定**：限制允許的來源網域
4. **Application Access Policy**：透過 Exchange Online 限制只能存取特定使用者的行事曆

## 授權條款

MIT License
