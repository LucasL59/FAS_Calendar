@echo off
chcp 65001 >nul
echo ========================================
echo   FAS Calendar - 前端服務啟動
echo ========================================
echo.

cd /d "%~dp0frontend"

REM 檢查 node_modules 是否存在
if not exist "node_modules" (
    echo [1/2] 安裝依賴套件...
    call npm install
    if errorlevel 1 (
        echo 錯誤: 無法安裝依賴，請確認 Node.js 已安裝
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   啟動前端服務 (http://localhost:5173)
echo   按 Ctrl+C 停止服務
echo ========================================
echo.

REM 啟動開發伺服器
call npm run dev
