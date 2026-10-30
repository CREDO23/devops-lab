# One front door for every service; each service keeps its own native commands.
.DEFAULT_GOAL := help
.PHONY: help install test check install-worker test-worker check-worker install-api test-api check-api

# Use the worker's .env when it exists; elsewhere the variables come from the environment.
WORKER_ENV_FILE := $(if $(wildcard app/worker/.env),--env-file .env)

# Switches to the Node version in the service's .nvmrc when nvm is installed; CI reads .nvmrc itself.
USE_NODE := if [ -s "$$NVM_DIR/nvm.sh" ]; then . "$$NVM_DIR/nvm.sh" && nvm use --silent; fi

# A heading before each step, in bold when shown in a terminal.
heading = @if [ -t 1 ]; then printf '\n\033[1m▶ %s\033[0m\n' '$(1)'; else printf '\n▶ %s\n' '$(1)'; fi

# One ✔ line when a check passes; its full output when it fails.
quietly = out=$$($(2) 2>&1) && echo "  ✔ $(1)" || { echo "  ✘ $(1)"; echo "$$out"; exit 1; }

help: ## List the commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-15s %s\n", $$1, $$2}'

install: install-worker install-api ## Install every service's dependencies

test: test-worker test-api ## Run every service's tests

check: check-worker check-api ## Run every service's linting, formatting, type and boundary checks

install-worker: ## Worker dependencies
	$(call heading,worker · install)
	@cd app/worker && uv sync

test-worker: ## Worker tests (needs Postgres and Valkey)
	$(call heading,worker · tests)
	@cd app/worker && uv run $(WORKER_ENV_FILE) pytest -q

check-worker: ## Worker linting, formatting, types and import boundaries
	$(call heading,worker · checks)
	@cd app/worker && $(call quietly,ruff lint,uv run ruff check .)
	@cd app/worker && $(call quietly,ruff format,uv run ruff format --check .)
	@cd app/worker && $(call quietly,mypy types,uv run mypy src tests)
	@cd app/worker && $(call quietly,import boundaries,uv run lint-imports)

install-api: ## API dependencies
	$(call heading,api · install)
	@cd app/api && $(USE_NODE) && pnpm install --frozen-lockfile

test-api: ## API tests (needs Postgres and Valkey; builds the API first)
	$(call heading,api · tests)
	@cd app/api && $(USE_NODE) && pnpm -s test

check-api: ## API types, linting, formatting and import boundaries
	$(call heading,api · checks)
	@cd app/api && $(USE_NODE) && $(call quietly,types,pnpm -s typecheck)
	@cd app/api && $(USE_NODE) && $(call quietly,oxlint,pnpm -s lint)
	@cd app/api && $(USE_NODE) && $(call quietly,prettier,pnpm -s format:check)
	@cd app/api && $(USE_NODE) && $(call quietly,import boundaries,pnpm -s boundaries)
