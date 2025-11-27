# 部署紀錄與設定說明

> 本文件彙整 2025/11/27 的對話與排錯結果，方便後續成員快速瞭解 FAS Calendar 在 Render（後端）與 Vercel（前端）的佈署細節與常見問題。

## 1. 時間線摘要

1. **前端 API 404**：Vercel 佈署後仍呼叫 `/api/...`（自身網域），確認 `VITE_API_URL` 未被 build 讀取。
2. **修正 API base URL**：`frontend/src/services/api.ts` 改讀 `VITE_API_BASE_URL`，後續使用者改以調整 Vercel 環境變數方式解決。
3. **切換至 Render 後端**：前端成功指向 `https://fas-calendar-backend.onrender.com/api`，但出現 CORS 阻擋。
4. **CORS 排查**：確認後端未回傳 `Access-Control-Allow-Origin`。透過 `curl -I -H "Origin: https://fas-calendar.vercel.app" https://fas-calendar-backend.onrender.com/api/sync/status` 驗證確實缺少標頭。
5. **修正 ALLOWED_ORIGINS**：在 Render 環境變數刪除疑似含不可見字元的舊值，改為 `https://fas-calendar.vercel.app,http://localhost:5173` 後立即恢復正常。
6. **前端程式調整**：依使用者需求，`api.ts` 最終維持 `const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';` 以配合現有 Vercel 設定。

## 2. 佈署環境概覽

| 角色 | 服務 | 網址 / 備註 |
|------|------|-------------|
| 原始碼 | GitHub | https://github.com/LucasL59/FAS_Calendar.git （`master` 分支） |
| 後端 | Render Web Service | https://fas-calendar-backend.onrender.com |
| 前端 | Vercel | https://fas-calendar.vercel.app |

## 3. 關鍵環境變數

### 後端（Render /.env）
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- `USER_EMAILS`：逗號分隔
- `SYNC_INTERVAL_MINUTES`, `CACHE_DURATION_MINUTES`, `SYNC_DAYS_AHEAD`, `SYNC_DAYS_BACK`
- `API_KEY`（選用）
- `ALLOWED_ORIGINS`：**必須完全匹配 `Origin` 字串，使用半形逗號分隔且避免多餘空白/換行。**
  - 當前值：`https://fas-calendar.vercel.app,http://localhost:5173`

### 前端（Vercel）
- `VITE_API_URL`：`https://fas-calendar-backend.onrender.com/api`
- 如需 API Key，可加設 `VITE_API_KEY`

> 注意：Vite 會在 build 時讀取環境變數，變更後需重新部署。

## 4. 佈署流程備忘

### 後端（Render）
1. Render 服務設定：
   - Build Command：`pip install -r requirements.txt`
   - Start Command：`uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Branch：`master`
2. 調整 `.env` 或 Render Environment Variables 後，需點選 **Deploy latest commit** 重新啟動。
3. 驗證 CORS：
   ```bash
   curl -I -H "Origin: https://fas-calendar.vercel.app" https://fas-calendar-backend.onrender.com/api/sync/status
   ```
   若成功，回應標頭會包含 `Access-Control-Allow-Origin: https://fas-calendar.vercel.app`。

### 前端（Vercel）
1. Project Settings → General：Framework 選 Vite（或 Other），Build Command `npm run build`，Output `dist`。
2. Project Settings → Environment Variables：新增/更新 `VITE_API_URL`。
3. 每次變更環境變數後需重新部署（Redeploy）。
4. 部署完成後，可在瀏覽器 console 驗證：
   ```js
   console.log(import.meta.env.VITE_API_URL);
   ```
   若 `undefined` 表示 build 時未讀到。

## 5. 常見問題與處理

| 問題 | 表現 | 解法 |
|------|------|------|
| API 指向錯誤 | 404 到 `/api/...`（Vercel 自己） | 確認 `VITE_API_URL` 為 `https://fas-calendar-backend.onrender.com/api`，並重新部署前端。 |
| CORS 被阻擋 | Console 顯示 `No 'Access-Control-Allow-Origin' header` | Render `ALLOWED_ORIGINS` 必須含 `https://fas-calendar.vercel.app`，確保無額外空白/換行後重新部署。 |
| CORS 仍失敗 | `curl -I` 看不到標頭 | 可能仍存在不可見字元或大小寫差異，建議在 Render UI 手動逐字輸入，並確認 `settings.allowed_origin_list` 只含期待字串。 |
| API URL 變更未生效 | Console `import.meta.env.VITE_API_URL` 為 `undefined` | Vercel 需重新 build；可在程式內暫時 `console.log('API_BASE_URL', import.meta.env.VITE_API_URL)` 以協助檢查。 |

## 6. 後續建議

1. **建立 `.env.production` 範本**：列出 Render/Vercel 需要的變數，方便新成員照填。
2. **自動化佈署檢查**：可在前端 build 前加入簡單 script 檢查 `VITE_API_URL` 是否為合法 URL。
3. **Monitoring**：考慮在 Render 加上健康檢查或通知，以便 API 失效時能即時得知。

---
若需更新本文或新增新的部署狀態，請直接編輯 `docs/deployment-notes.md`，並記錄日期與調整內容。
