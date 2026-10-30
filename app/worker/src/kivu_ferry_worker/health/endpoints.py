from fastapi import APIRouter, Response

from kivu_ferry_worker.config import Settings
from kivu_ferry_worker.health.dependency_checks import failing_dependencies


def create_health_routes(settings: Settings) -> APIRouter:
    router = APIRouter()

    @router.get("/livez")
    async def liveness() -> dict[str, str]:
        # Never checks dependencies: a database outage must not get every worker restarted.
        return {"status": "alive"}

    @router.get("/readyz")
    async def readiness(response: Response) -> dict[str, str | list[str]]:
        failing = await failing_dependencies(settings)
        if failing:
            response.status_code = 503
            return {"status": "not ready", "failing": failing}
        return {"status": "ready"}

    return router
