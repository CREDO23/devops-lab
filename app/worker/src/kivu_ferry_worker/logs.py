"""Structured JSON logs on standard output, including the logs of libraries like Uvicorn."""

import logging
import sys
from typing import Literal

import structlog
from structlog.typing import Processor

# The same names as the API's, so operators use one vocabulary everywhere.
type LogLevel = Literal["debug", "info", "warn", "error", "silent"]

_LEVELS: dict[LogLevel, int] = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warn": logging.WARNING,
    "error": logging.ERROR,
    "silent": logging.CRITICAL + 1,
}


def set_log_level(level: LogLevel) -> None:
    logging.getLogger().setLevel(_LEVELS[level])


def configure_logging() -> None:
    shared: list[Processor] = [
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.format_exc_info,
    ]
    structlog.configure(
        processors=[*shared, structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            foreign_pre_chain=shared,
            processors=[
                structlog.stdlib.ProcessorFormatter.remove_processors_meta,
                structlog.processors.JSONRenderer(),
            ],
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
