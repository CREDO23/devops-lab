"""The worker's HTTP API, for the platform and operators; never routed by the proxy."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from kivu_ferry_worker.config import Settings
from kivu_ferry_worker.health import create_health_routes
from kivu_ferry_worker.version import running_version


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
    log = structlog.get_logger()
    log.info("worker started", version=running_version())
    yield
    # Runs only once in-flight requests are done: proof the shutdown was graceful.
    log.info("worker stopped")


def create_api(settings: Settings) -> FastAPI:
    api = FastAPI(lifespan=lifespan)
    api.include_router(create_health_routes(settings))

    @api.get("/version")
    async def version() -> dict[str, str]:
        return {"version": running_version()}

    return api
