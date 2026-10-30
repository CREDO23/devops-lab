# One front door for every service; each service keeps its own native commands.
.DEFAULT_GOAL := help
.PHONY: help install test check db-new-migration db-migrate db-rollback db-seed install-db test-db check-db install-worker test-worker check-worker install-api test-api check-api install-web test-web check-web

# Use the worker's .env when it exists; elsewhere the variables come from the environment.
WORKER_ENV_FILE := $(if $(wildcard app/worker/.env),--env-file .env)

# Switches to the Node version in the service's .nvmrc when nvm is installed; CI reads .nvmrc itself.
USE_NODE := if [ -s "$$NVM_DIR/nvm.sh" ]; then . "$$NVM_DIR/nvm.sh" && nvm use --silent; fi

heading = @if [ -t 1 ]; then printf '\n\033[1m▶ %s\033[0m\n' '$(1)'; else printf '\n▶ %s\n' '$(1)'; fi

# One ✔ line when a check passes; its full output when it fails.
quietly = out=$$($(2) 2>&1) && echo "  ✔ $(1)" || { echo "  ✘ $(1)"; echo "$$out"; exit 1; }

help: ## List the commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-17s %s\n", $$1, $$2}'

install: install-db install-worker install-api install-web ## Install every service's dependencies

test: test-db test-worker test-api test-web ## Run every service's tests

check: check-db check-worker check-api check-web ## Run every service's linting, formatting, type and boundary checks

db-new-migration: ## Create an empty migration file: make db-new-migration name=add_passenger_name
	$(call heading,db · new migration)
	@[ -n "$(name)" ] || { echo "  ✘ missing name: make db-new-migration name=add_passenger_name"; exit 1; }
	@cd app/db && $(USE_NODE) && pnpm -s new-migration "$(name)"

db-migrate: ## Apply the database migrations and update schema.sql
	$(call heading,db · migrate)
	@cd app/db && $(USE_NODE) && pnpm -s migrate

db-rollback: ## Undo the newest database migration and update schema.sql
	$(call heading,db · rollback)
	@cd app/db && $(USE_NODE) && pnpm -s rollback

db-seed: ## Load fake data, for development and staging only
	$(call heading,db · seed)
	@cd app/db && $(USE_NODE) && pnpm -s seed

install-db: ## Database tooling
	$(call heading,db · install)
	@cd app/db && $(USE_NODE) && pnpm install --frozen-lockfile

test-db: ## Database tests (needs Postgres)
	$(call heading,db · tests)
	@cd app/db && $(USE_NODE) && pnpm -s test

check-db: ## Database test code: types and formatting
	$(call heading,db · checks)
	@cd app/db && $(USE_NODE) && $(call quietly,types,pnpm -s typecheck)
	@cd app/db && $(USE_NODE) && $(call quietly,prettier,pnpm -s format:check)

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

install-web: ## Web app dependencies
	$(call heading,web · install)
	@cd app/web && $(USE_NODE) && pnpm install --frozen-lockfile

test-web: ## Web app tests (builds the web app first; needs nothing else running)
	$(call heading,web · tests)
	@cd app/web && $(USE_NODE) && NEXT_TELEMETRY_DISABLED=1 pnpm -s test

check-web: ## Web app types, linting, formatting and import boundaries
	$(call heading,web · checks)
	@cd app/web && $(USE_NODE) && $(call quietly,types,pnpm -s typecheck)
	@cd app/web && $(USE_NODE) && $(call quietly,eslint,pnpm -s lint)
	@cd app/web && $(USE_NODE) && $(call quietly,prettier,pnpm -s format:check)
	@cd app/web && $(USE_NODE) && $(call quietly,import boundaries,pnpm -s boundaries)
