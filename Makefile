# One front door for every service; each service keeps its own native commands.
.DEFAULT_GOAL := help
.PHONY: help test check test-worker check-worker

# Use the worker's .env when it exists; elsewhere the variables come from the environment.
WORKER_ENV_FILE := $(if $(wildcard app/worker/.env),--env-file .env)

help: ## List the commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-14s %s\n", $$1, $$2}'

test: test-worker ## Run every service's tests

check: check-worker ## Run every service's linting, formatting, type and boundary checks

test-worker: ## Worker tests (needs Postgres and Valkey)
	cd app/worker && uv run $(WORKER_ENV_FILE) pytest

check-worker: ## Worker linting, formatting, types and import boundaries
	cd app/worker && uv run ruff check . && uv run ruff format --check . \
		&& uv run mypy src tests && uv run lint-imports
