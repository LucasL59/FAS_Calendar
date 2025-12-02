"""
FAS Calendar - 團隊行事曆聚合系統
FastAPI 主程式入口
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from .config import get_settings
from .routers import calendars_router
from .routers.calendars import init_services
from .services import CacheService, GraphService, SyncService, OnCallService

# 設定 loguru
logger.add(
    "logs/fas_calendar_{time}.log",
    rotation="1 day",
    retention="7 days",
    level="INFO",
    encoding="utf-8",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理"""
    settings = get_settings()

    # 初始化服務
    logger.info("正在初始化服務...")

    graph_service = GraphService(settings)
    cache_service = CacheService(settings)
    sync_service = SyncService(graph_service, cache_service, settings)
    oncall_service = OnCallService(settings)

    # 注入服務到路由
    init_services(graph_service, cache_service, sync_service, oncall_service)

    # 啟動排程器
    if settings.is_azure_configured:
        sync_service.start_scheduler()

        # 立即執行一次同步
        logger.info("執行初始同步...")
        await sync_service.sync_calendars()
    else:
        logger.warning(
            "Azure AD 未設定，跳過自動同步。"
            "請設定 AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
        )

    logger.info("服務初始化完成")

    yield

    # 清理資源
    logger.info("正在關閉服務...")
    sync_service.stop_scheduler()
    await graph_service.close()
    logger.info("服務已關閉")


# 建立 FastAPI 應用程式
app = FastAPI(
    title="FAS Calendar API",
    description="團隊行事曆聚合系統 - 透過 Microsoft Graph API 整合多位同事的 Outlook 行事曆",
    version="1.0.0",
    lifespan=lifespan,
)

# 設定 CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Key 驗證中間件 (選用)
@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    """API Key 驗證中間件"""
    settings = get_settings()

    # 如果未設定 API Key，則跳過驗證
    if not settings.api_key:
        return await call_next(request)

    # 排除健康檢查和文件端點
    excluded_paths = ["/health", "/docs", "/redoc", "/openapi.json"]
    if any(request.url.path.startswith(path) for path in excluded_paths):
        return await call_next(request)

    # 檢查 API Key
    api_key = request.headers.get("X-API-Key")
    if api_key != settings.api_key:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or missing API Key"},
        )

    return await call_next(request)


# 註冊路由
app.include_router(calendars_router)


# 根路徑
@app.get("/")
async def root():
    """根路徑"""
    return {
        "name": "FAS Calendar API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
