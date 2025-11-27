"""
設定管理模組
使用 pydantic-settings 管理環境變數
"""

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """應用程式設定"""

    # Azure AD 設定
    azure_tenant_id: str = ""
    azure_client_id: str = ""
    azure_client_secret: str = ""

    # 使用者設定
    user_emails: str = ""  # 逗號分隔的信箱清單

    # 同步設定
    sync_interval_minutes: int = 10
    cache_duration_minutes: int = 15
    sync_days_ahead: int = 60
    sync_days_back: int = 365

    # API 安全設定
    api_key: Optional[str] = None

    # CORS 設定
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # 伺服器設定
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def user_email_list(self) -> List[str]:
        """取得使用者信箱清單"""
        if not self.user_emails:
            return []
        return [email.strip() for email in self.user_emails.split(",") if email.strip()]

    @property
    def allowed_origin_list(self) -> List[str]:
        """取得允許的 CORS 來源清單"""
        if not self.allowed_origins:
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def is_azure_configured(self) -> bool:
        """檢查 Azure AD 是否已設定"""
        return all([
            self.azure_tenant_id,
            self.azure_client_id,
            self.azure_client_secret,
        ])


@lru_cache
def get_settings() -> Settings:
    """取得設定單例"""
    return Settings()
