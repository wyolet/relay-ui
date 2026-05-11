RELAY_URL ?= https://relay-control-api.wyolet.dev

.DEFAULT_GOAL := help

.PHONY: help gen dev build ci typecheck lint

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*##"}; {printf "  %-12s %s\n", $$1, $$2}'

gen: ## Regenerate src/api/types.gen.ts from RELAY_URL (default: https://relay.wyolet.dev)
	@tmp=$$(mktemp /tmp/openapi-XXXXXX.json); \
	echo "Fetching OpenAPI spec from $(RELAY_URL)/openapi.json …"; \
	curl -sk -H 'Cache-Control: no-cache' "$(RELAY_URL)/openapi.json?nocache=$$(date +%s)" -o "$$tmp"; \
	echo "Running openapi-typescript …"; \
	bun x openapi-typescript "$$tmp" -o src/api/types.gen.ts; \
	rm -f "$$tmp"; \
	echo "Done. src/api/types.gen.ts updated."

dev: ## Start Vite dev server on :5140
	bun run dev

build: ## Build production bundle to dist/
	bun run build

ci: ## Run typecheck + lint
	bun run ci

typecheck: ## Run tsc --noEmit
	bun run typecheck

lint: ## Run biome lint
	bun run lint
