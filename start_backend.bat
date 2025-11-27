@echo off
chcp 65001 >nul
echo ========================================
echo   FAS Calendar - 後端服務啟動
echo ========================================
echo.

cd /d "%~dp0backend"

REM 檢查虛擬環境是否存在
if not exist "venv" (
    echo [1/3] 建立虛擬環境...
    python -m venv venv
    if errorlevel 1 (
        echo 錯誤: 無法建立虛擬環境，請確認 Python 已安裝
        pause
        exit /b 1
    )
)

REM 啟動虛擬環境
echo [2/3] 啟動虛擬環境...
call venv\Scripts\activate.bat

REM 安裝依賴
echo [3/3] 安裝依賴套件...
pip install -r requirements.txt -q

echo.
echo ========================================
echo   啟動後端服務 (http://localhost:8000)
echo   API 文件: http://localhost:8000/docs
echo   按 Ctrl+C 停止服務
echo ========================================
echo.

REM 啟動服務
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
