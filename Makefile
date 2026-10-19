# Load RELAY_URL (and any other overrides) from a gitignored .env if present,
# so you can point `make gen` at a remote control plane without exporting vars
# every time, e.g.  RELAY_URL=https://relay-control-api.example.dev/api
-include .env
export

# The control API — and its /openapi.json — mount under /api on the control
# plane (:8081 locally; :8080 is the data plane and serves the wrong spec).
RELAY_URL ?= http://localhost:8081/api

.DEFAULT_GOAL := help

.PHONY: help gen dev build ci typecheck lint release

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*##"}; {printf "  %-12s %s\n", $$1, $$2}'

gen: ## Regenerate src/api/types.gen.ts from RELAY_URL (default: http://localhost:8081/api)
	@set -e; tmp=$$(mktemp /tmp/openapi-XXXXXX.json); trap 'rm -f "$$tmp"' EXIT; \
	echo "Fetching OpenAPI spec from $(RELAY_URL)/openapi.json …"; \
	curl -fsS -H 'Cache-Control: no-cache' "$(RELAY_URL)/openapi.json?nocache=$$(date +%s)" -o "$$tmp"; \
	echo "Running openapi-typescript …"; \
	bun x openapi-typescript "$$tmp" -o src/api/types.gen.ts; \
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

release: ## Tag the newest main commit with green CI and push the tag: make release VERSION=v1.2.3
	@test -n "$(VERSION)" || { echo "Usage: make release VERSION=vX.Y.Z"; exit 1; }
	@echo "$(VERSION)" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$$' || { echo "VERSION must look like vX.Y.Z (got '$(VERSION)')"; exit 1; }
	@git fetch -q origin main
	@# Asked of the remote: fetching tags trips over the moving "latest" tag.
	@test -z "$$(git ls-remote --tags origin "refs/tags/$(VERSION)")" || { echo "Tag $(VERSION) already exists."; exit 1; }
	@# No release commit: the build stamps the version from the tag, so a tag
	@# push runs only the Release workflow, on a commit CI already passed.
	@set -e; \
	sha=$$(gh run list --workflow CI --branch main --event push --status success --limit 1 --json headSha -q '.[0].headSha'); \
	test -n "$$sha" || { echo "No green CI run on main."; exit 1; }; \
	if [ "$$sha" != "$$(git rev-parse origin/main)" ]; then \
		echo "origin/main $$(git rev-parse --short origin/main) has no green CI yet; tagging $$(git rev-parse --short $$sha), the newest green commit."; \
	fi; \
	git tag -a "$(VERSION)" -m "relay-ui $(VERSION)" "$$sha"; \
	git push -q origin "$(VERSION)"; \
	echo "Pushed $(VERSION) at $$(git rev-parse --short $$sha) — Release workflow will build, checksum, and publish the tarball."
