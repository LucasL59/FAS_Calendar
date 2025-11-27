# FAS Calendar 設定指南

## 快速開始

### 步驟 1: Azure AD 應用程式註冊

1. 登入 [Azure Portal](https://portal.azure.com)
2. 搜尋並進入 **Microsoft Entra ID** (原 Azure Active Directory)
3. 點擊左側選單 **應用程式註冊** → **新增註冊**
4. 填寫資訊：
   - **名稱**: `FAS Calendar`
   - **支援的帳戶類型**: `僅限此組織目錄中的帳戶`
   - **重新導向 URI**: 留空
5. 點擊 **註冊**

### 步驟 2: 建立用戶端密碼

1. 在應用程式頁面，點擊左側 **憑證及祕密**
2. 點擊 **新增用戶端密碼**
3. 填寫：
   - **描述**: `FAS Calendar Secret`
   - **到期**: 選擇 `24 個月`
4. 點擊 **新增**
5. **立即複製密碼值** (只會顯示一次！)

### 步驟 3: 設定 API 權限

1. 點擊左側 **API 權限**
2. 點擊 **新增權限** → **Microsoft Graph**
3. 選擇 **應用程式權限** (不是委派權限)
4. 搜尋並勾選：
   - `Calendars.Read` - 讀取所有使用者的行事曆
   - `User.Read.All` - 讀取所有使用者的基本資訊
5. 點擊 **新增權限**
6. 點擊 **代表 {組織名稱} 授予管理員同意**
7. 確認權限狀態顯示綠色勾勾

### 步驟 4: 記錄必要資訊

在應用程式 **概觀** 頁面，記錄以下資訊：

| 項目 | 位置 |
|------|------|
| **Tenant ID** | 目錄 (租用戶) 識別碼 |
| **Client ID** | 應用程式 (用戶端) 識別碼 |
| **Client Secret** | 步驟 2 複製的密碼值 |

### 步驟 5: 設定環境變數

編輯 `backend/.env` 檔案：

```env
# Azure AD 設定
AZURE_TENANT_ID=你的-tenant-id
AZURE_CLIENT_ID=你的-client-id
AZURE_CLIENT_SECRET=你的-client-secret

# 要同步的使用者信箱 (逗號分隔)
USER_EMAILS=user1@company.com,user2@company.com,user3@company.com
```

### 步驟 6: 啟動服務

**方法 A: 使用批次檔 (推薦)**

1. 雙擊 `start_backend.bat` 啟動後端
2. 開啟新的命令提示字元，雙擊 `start_frontend.bat` 啟動前端

**方法 B: 手動啟動**

後端：
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

前端：
```bash
cd frontend
npm install
npm run dev
```

### 步驟 7: 開始使用

- 前端網頁: http://localhost:5173
- 後端 API 文件: http://localhost:8000/docs

---

## 進階設定

### 限制存取範圍 (建議)

預設情況下，Application Permission 可以存取組織內所有使用者的行事曆。
建議透過 **Application Access Policy** 限制只能存取特定使用者。

1. 安裝 Exchange Online PowerShell 模組：
```powershell
Install-Module -Name ExchangeOnlineManagement
```

2. 連接到 Exchange Online：
```powershell
Connect-ExchangeOnline
```

3. 建立安全性群組並加入成員：
```powershell
# 建立群組
New-DistributionGroup -Name "CalendarAccessGroup" -Type "Security"

# 加入成員
Add-DistributionGroupMember -Identity "CalendarAccessGroup" -Member "user1@company.com"
Add-DistributionGroupMember -Identity "CalendarAccessGroup" -Member "user2@company.com"
```

4. 建立存取原則：
```powershell
New-ApplicationAccessPolicy `
  -AppId "你的-client-id" `
  -PolicyScopeGroupId "CalendarAccessGroup@company.com" `
  -AccessRight RestrictAccess `
  -Description "限制 FAS Calendar 只能存取團隊成員"
```

5. 測試原則：
```powershell
Test-ApplicationAccessPolicy `
  -Identity "user1@company.com" `
  -AppId "你的-client-id"
```

### API Key 保護

如果要啟用 API Key 驗證，在 `backend/.env` 設定：

```env
API_KEY=your-secret-api-key-here
```

前端需要在 `frontend/.env` 設定：

```env
VITE_API_KEY=your-secret-api-key-here
```

---

## 常見問題

### Q: 出現 "AADSTS700016" 錯誤
**A:** Client ID 或 Tenant ID 設定錯誤，請確認 `.env` 檔案中的值正確。

### Q: 出現 "Insufficient privileges" 錯誤
**A:** API 權限未正確授予。請確認：
1. 已新增 `Calendars.Read` 和 `User.Read.All` 權限
2. 已點擊「代表組織授予管理員同意」
3. 權限狀態顯示綠色勾勾

### Q: 行事曆資料為空
**A:** 請確認：
1. `USER_EMAILS` 環境變數已正確設定
2. 指定的使用者信箱存在於組織中
3. 等待同步完成 (查看後端 console 輸出)

### Q: 前端無法連接後端
**A:** 請確認：
1. 後端服務已啟動 (http://localhost:8000)
2. 前端 `vite.config.ts` 的 proxy 設定正確
3. 沒有防火牆阻擋

---

## 技術支援

如有問題，請檢查：
1. 後端 console 輸出的錯誤訊息
2. 瀏覽器開發者工具的 Network 和 Console 標籤
3. `backend/logs/` 目錄下的日誌檔案
