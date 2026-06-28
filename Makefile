RELAY_URL ?= http://localhost:8080

.DEFAULT_GOAL := help

.PHONY: help gen dev build ci typecheck lint release

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*##"}; {printf "  %-12s %s\n", $$1, $$2}'

gen: ## Regenerate src/api/types.gen.ts from RELAY_URL (default: http://localhost:8080)
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

release: ## Cut a release: make release VERSION=v1.2.3 (bumps package.json, tags, pushes)
	@test -n "$(VERSION)" || { echo "Usage: make release VERSION=vX.Y.Z"; exit 1; }
	@echo "$(VERSION)" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$$' || { echo "VERSION must look like vX.Y.Z (got '$(VERSION)')"; exit 1; }
	@test -z "$$(git status --porcelain)" || { echo "Working tree is dirty — commit or stash first."; exit 1; }
	@git rev-parse "$(VERSION)" >/dev/null 2>&1 && { echo "Tag $(VERSION) already exists."; exit 1; } || true
	@echo "Running checks before tagging …"
	@bun run ci
	@echo "Bumping package.json to $(VERSION:v%=%) …"
	@bun --eval 'const f="package.json";const p=JSON.parse(await Bun.file(f).text());const o={};for(const k of Object.keys(p)){o[k]=p[k];if(k==="name")o.version="$(VERSION:v%=%)";}o.version="$(VERSION:v%=%)";await Bun.write(f,JSON.stringify(o,null,2)+"\n");'
	@git add package.json
	@git commit -m "release: $(VERSION)"
	@git tag -a "$(VERSION)" -m "relay-ui $(VERSION)"
	@git push origin HEAD "$(VERSION)"
	@echo "Pushed $(VERSION) — Release workflow will build, checksum, and publish the tarball."
