"""Seam: the worker's HTTP API, called through an HTTP client.

Tests marked with `running_services` need a real Postgres and Valkey, found through
TEST_DATABASE_URL and TEST_VALKEY_URL.
"""

import os
import tomllib
from pathlib import Path

import httpx
import pytest

from kivu_ferry_worker.api import create_api
from kivu_ferry_worker.config import Settings, load_settings

# Port 1 is closed: connections are refused at once, a real failure with nothing mocked.
UNREACHABLE = load_settings(
    {
        "DATABASE_URL": "postgresql://kivu:kivu@127.0.0.1:1/kivu",
        "VALKEY_URL": "redis://127.0.0.1:1/0",
        "INTERNAL_PORT": "8001",
    }
)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def running_services() -> Settings:
    missing = [name for name in ("TEST_DATABASE_URL", "TEST_VALKEY_URL") if name not in os.environ]
    if missing:
        pytest.fail(f"Start Postgres and Valkey, then set {', '.join(missing)}")
    return load_settings(
        {
            "DATABASE_URL": os.environ["TEST_DATABASE_URL"],
            "VALKEY_URL": os.environ["TEST_VALKEY_URL"],
            "INTERNAL_PORT": "8001",
        }
    )


async def get(path: str, settings: Settings) -> httpx.Response:
    transport = httpx.ASGITransport(app=create_api(settings))
    async with httpx.AsyncClient(transport=transport, base_url="http://worker") as client:
        return await client.get(path)


@pytest.mark.anyio
async def test_liveness_is_ok_even_when_dependencies_are_down() -> None:
    """Liveness ignores Postgres and Valkey: a database outage must not get workers restarted."""
    response = await get("/livez", UNREACHABLE)

    assert response.status_code == 200


@pytest.mark.anyio
async def test_version_is_the_one_declared_in_pyproject() -> None:
    """/version reports what pyproject.toml declares, read here independently of the code."""
    pyproject = tomllib.loads((Path(__file__).parents[1] / "pyproject.toml").read_text())

    response = await get("/version", UNREACHABLE)

    assert response.json() == {"version": pyproject["project"]["version"]}


@pytest.mark.anyio
async def test_not_ready_names_every_dependency_that_is_down() -> None:
    """With both Postgres and Valkey unreachable, /readyz says not ready and names both."""
    response = await get("/readyz", UNREACHABLE)

    assert (response.status_code, response.json()) == (
        503,
        {"status": "not ready", "failing": ["postgres", "valkey"]},
    )


@pytest.mark.anyio
async def test_ready_when_postgres_and_valkey_answer(running_services: Settings) -> None:
    """With a real Postgres and Valkey answering, /readyz says ready."""
    response = await get("/readyz", running_services)

    assert (response.status_code, response.json()) == (200, {"status": "ready"})


@pytest.mark.anyio
async def test_not_ready_names_only_the_dependency_that_is_down(
    running_services: Settings,
) -> None:
    """Only the dependency that is really down gets named, so you know where to look."""
    valkey_down = running_services.model_copy(update={"valkey_url": UNREACHABLE.valkey_url})

    response = await get("/readyz", valkey_down)

    assert (response.status_code, response.json()) == (
        503,
        {"status": "not ready", "failing": ["valkey"]},
    )
