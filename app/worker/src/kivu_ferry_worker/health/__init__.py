"""Liveness and readiness checks, served on the internal port."""

from kivu_ferry_worker.health.endpoints import create_health_routes

__all__ = ["create_health_routes"]
