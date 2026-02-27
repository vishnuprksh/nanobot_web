"""Backend configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    secret_key: str = "nanobot-web-change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720  # 12 hours

    # Default SSH connection (overridable via env)
    default_ssh_host: str = ""
    default_ssh_port: int = 22
    default_ssh_user: str = "root"
    default_ssh_password: str = ""

    # Nanobot paths on remote server
    nanobot_config_path: str = "~/.nanobot/config.json"
    nanobot_workspace_path: str = "~/.nanobot/workspace"

    class Config:
        env_prefix = "NANOBOT_WEB_"


settings = Settings()
