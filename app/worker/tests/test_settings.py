"""Seam: load_settings(), which turns environment variables into checked settings."""

import pytest

from kivu_ferry_worker.config import SettingsError, load_settings

VALID_ENVIRONMENT = {
    "DATABASE_URL": "postgresql://kivu:secret@db.internal:5432/kivu",
    "VALKEY_URL": "redis://cache.internal:6379/0",
    "INTERNAL_PORT": "8001",
}


def test_valid_environment_gives_typed_settings() -> None:
    """Environment variables are text; the worker gets URLs and a port number it can use."""
    settings = load_settings(VALID_ENVIRONMENT)

    assert (str(settings.database_url), str(settings.valkey_url), settings.internal_port) == (
        "postgresql://kivu:secret@db.internal:5432/kivu",
        "redis://cache.internal:6379/0",
        8001,
    )


def test_log_level_defaults_to_info() -> None:
    """LOG_LEVEL is optional: without it, the worker logs at its normal level."""
    assert load_settings(VALID_ENVIRONMENT).log_level == "info"


def test_unknown_log_level_is_named_in_the_error() -> None:
    """A level the worker doesn't know is caught at startup, with the variable's name."""
    with pytest.raises(SettingsError, match="LOG_LEVEL"):
        load_settings({**VALID_ENVIRONMENT, "LOG_LEVEL": "loud"})


def test_missing_variable_is_named_in_the_error() -> None:
    """A missing variable stops the worker with its name, so the fix is obvious."""
    environment = {k: v for k, v in VALID_ENVIRONMENT.items() if k != "DATABASE_URL"}

    with pytest.raises(SettingsError, match="DATABASE_URL"):
        load_settings(environment)


def test_port_out_of_range_is_named_in_the_error() -> None:
    """An impossible port is caught at startup, not later when the server fails to open it."""
    environment = {**VALID_ENVIRONMENT, "INTERNAL_PORT": "70000"}

    with pytest.raises(SettingsError, match="INTERNAL_PORT"):
        load_settings(environment)


def test_error_never_contains_the_password() -> None:
    """The error ends up in the logs, so it must never carry a value like a password."""
    environment = {**VALID_ENVIRONMENT, "DATABASE_URL": "mysql://kivu:hunter2@db.internal/kivu"}

    with pytest.raises(SettingsError) as raised:
        load_settings(environment)

    assert "hunter2" not in str(raised.value)
