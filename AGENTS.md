# AGENTS.md

## Cursor Cloud specific instructions

### 產品概覽

**FAS Calendar** 是單一全端 Web 應用：React + Vite 前端（`frontend/`）與 FastAPI 後端（`backend/`）。後端透過 Microsoft Graph API 同步 Outlook 行事曆；前端在開發模式將 `/api` 代理至 `http://localhost:8000`（見 `frontend/vite.config.ts`）。

### 必要服務

| 服務 | 埠號 | 啟動方式 |
|------|------|----------|
| Backend (FastAPI) | 8000 | `cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` |
| Frontend (Vite) | 5173 | `cd frontend && npm run dev -- --host 0.0.0.0 --port 5173` |

兩者皆需同時運行才能完整測試 UI 與 API。建議使用 tmux 分開管理長時間執行的 dev server。

### 環境設定

1. 複製 `backend/.env.example` 為 `backend/.env`。
2. **完整行事曆同步**需設定 Azure AD 憑證：`AZURE_TENANT_ID`、`AZURE_CLIENT_ID`、`AZURE_CLIENT_SECRET`、`USER_EMAILS`。詳見 `SETUP_GUIDE.md`。
3. 若僅驗證 UI 與本地 API，可使用 `.env.example` 的 placeholder 值；`/api/calendars/oncall` 與 `/api/users` 可正常回應，但 `/api/calendars/events` 在無有效 Azure 憑證時會失敗。

### 首次 VM 設定注意

Ubuntu 環境若 `python3 -m venv` 失敗，需一次性安裝系統套件（**不在** update script 內）：

```bash
sudo apt-get install -y python3.12-venv
```

### 常用指令

詳細說明見 `README.md`。

| 任務 | 指令 |
|------|------|
| 後端依賴 | `cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt` |
| 前端依賴 | `cd frontend && npm ci` |
| 前端建置 | `cd frontend && npm run build` |
| 前端 lint | `cd frontend && npm run lint`（目前 repo 缺少 ESLint flat config，可能報錯） |
| 健康檢查 | `curl http://localhost:8000/api/health` |
| API 文件 | http://localhost:8000/docs |

### 已知限制

- 無 Docker、無資料庫；快取為記憶體內 TTL cache。
- 無 Python 單元測試；驗證以 API curl 與前端 build/瀏覽器為主。
- `backend/logs/` 目錄需存在（uvicorn 啟動時 loguru 會寫入）；首次啟動前可 `mkdir -p backend/logs`。
