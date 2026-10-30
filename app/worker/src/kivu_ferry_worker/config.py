"""Settings from environment variables, checked once at startup."""

from collections.abc import Mapping

from pydantic import BaseModel, ConfigDict, Field, PostgresDsn, RedisDsn, ValidationError

from kivu_ferry_worker.logs import LogLevel


class SettingsError(Exception):
    """The environment can't produce valid settings; the worker must not start."""


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    database_url: PostgresDsn = Field(alias="DATABASE_URL")
    # Valkey speaks the Redis protocol, so its URL is a Redis URL.
    valkey_url: RedisDsn = Field(alias="VALKEY_URL")
    internal_port: int = Field(alias="INTERNAL_PORT", ge=1, le=65535)
    log_level: LogLevel = Field(alias="LOG_LEVEL", default="info")


def load_settings(environment: Mapping[str, str]) -> Settings:
    try:
        return Settings.model_validate(dict(environment))
    except ValidationError as error:
        # Names and reasons only, never values: DATABASE_URL carries a password.
        problems = "; ".join(f"{e['loc'][0]}: {e['msg']}" for e in error.errors())
        raise SettingsError(f"Invalid configuration: {problems}") from None
