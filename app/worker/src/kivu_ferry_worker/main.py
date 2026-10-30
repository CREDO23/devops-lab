"""Starts the worker and stops it cleanly on SIGTERM."""

import os
import sys

import structlog
import uvicorn

from kivu_ferry_worker.api import create_api
from kivu_ferry_worker.config import SettingsError, load_settings
from kivu_ferry_worker.logs import configure_logging, set_log_level


def main() -> None:
    configure_logging()
    try:
        settings = load_settings(os.environ)
    except SettingsError as error:
        structlog.get_logger().error("worker cannot start", reason=str(error))
        sys.exit(1)
    set_log_level(settings.log_level)

    uvicorn.run(
        create_api(settings),
        host="127.0.0.1",  # never reachable from the network
        port=settings.internal_port,
        log_config=None,  # Uvicorn logs through ours, as JSON
    )


if __name__ == "__main__":
    main()
