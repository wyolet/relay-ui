/**
 * Smoke-test `/catalog/resolve` against our local catalog-ref lib.
 *
 * Picks canonical-shape test refs from the live catalog, asks the backend to
 * resolve each one, compares the response's `expanded[]` against what our
 * FE `refCovers` produces over the same catalog, and prints per-ref diffs.
 *
 * Usage:
 *   RELAY_URL=http://localhost:8081/api \
 *   RELAY_COOKIE='session=...' \
 *     bun run scripts/smoke-resolve.ts
 *
 * Grab RELAY_COOKIE from your browser's devtools while logged into the UI.
 */

import {
	formatCatalogRef,
	parseCatalogRef,
	refCovers,
} from "../src/lib/catalogRef";
import type { Binding } from "../src/api/hooks/bindings";
import { buildConcreteCatalog } from "../src/lib/concreteCatalog";
import type { Host } from "../src/api/types/host";
import type { Model } from "../src/api/types/model";
import type { Provider } from "../src/api/types/provider";

// Control-API base, including the /api mount the routes live under.
const BASE = process.env.RELAY_URL ?? "http://localhost:8081/api";
const COOKIE = process.env.RELAY_COOKIE ?? "";

async function api<T>(path: string): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		headers: { ...(COOKIE ? { cookie: COOKIE } : {}) },
	});
	if (!res.ok) {
		throw new Error(`${path} → ${res.status} ${res.statusText}`);
	}
	return (await res.json()) as T;
}

interface ListResponse<T> {
	items: T[] | null;
}

interface ResolveResponse {
	refs: string[] | null;
	expanded: string[] | null;
	models: { id: string; name: string }[] | null;
	hosts: { id: string; name: string }[] | null;
	bindings: { hostId: string; modelId: string }[] | null;
}

async function main() {
	if (!COOKIE) {
		console.warn(
			"⚠ RELAY_COOKIE is unset; expect 401s unless your relay allows anonymous reads.\n",
		);
	}
	console.log(`Base URL: ${BASE}\n`);

	const [providers, models, hosts, bindings] = await Promise.all([
		api<ListResponse<Provider>>("/providers"),
		api<ListResponse<Model>>("/models"),
		api<ListResponse<Host>>("/hosts"),
		api<ListResponse<Binding>>("/host-bindings"),
	]);

	const providerList = providers.items ?? [];
	const modelList = models.items ?? [];
	const hostList = hosts.items ?? [];
	const bindingList = bindings.items ?? [];

	const catalog = buildConcreteCatalog({
		providers: providerList,
		models: modelList,
		hosts: hostList,
		bindings: bindingList,
		includeDeprecated: true,
	});
	console.log(
		`Local catalog: ${providerList.length} providers, ${modelList.length} models, ${hostList.length} hosts → ${catalog.length} concrete bindings.\n`,
	);

	const providerSlug = providerList[0]?.metadata.name;
	const hostSlug = hostList[0]?.metadata.name;
	const sampleBinding = catalog[0];

	const testRefs: string[] = [];
	if (providerSlug) testRefs.push(formatCatalogRef({ provider: providerSlug }));
	if (hostSlug) testRefs.push(formatCatalogRef({ host: hostSlug }));
	if (providerSlug && hostSlug)
		testRefs.push(formatCatalogRef({ provider: providerSlug, host: hostSlug }));
	if (sampleBinding)
		testRefs.push(
			formatCatalogRef({
				provider: sampleBinding.provider,
				model: sampleBinding.model,
			}),
		);
	if (sampleBinding)
		testRefs.push(
			formatCatalogRef({
				provider: sampleBinding.provider,
				model: sampleBinding.model,
				host: sampleBinding.host,
			}),
		);

	if (testRefs.length === 0) {
		console.error("Catalog appears empty — nothing to test against.");
		process.exit(1);
	}

	let mismatches = 0;
	for (const raw of testRefs) {
		const ref = parseCatalogRef(raw);
		const expectedSet = new Set(
			catalog
				.filter((b) => refCovers(ref, b))
				.map(
					(b) =>
						formatCatalogRef({
							provider: b.provider,
							model: b.model,
							host: b.host,
						}),
				),
		);

		let actualSet: Set<string>;
		try {
			const res = await api<ResolveResponse>(
				`/catalog/resolve?ref=${encodeURIComponent(raw)}`,
			);
			actualSet = new Set(res.expanded ?? []);
		} catch (err) {
			console.error(`✖ ${raw}  resolve call failed:`, err);
			mismatches++;
			continue;
		}

		const onlyLocal = [...expectedSet].filter((s) => !actualSet.has(s)).sort();
		const onlyServer = [...actualSet].filter((s) => !expectedSet.has(s)).sort();

		if (onlyLocal.length === 0 && onlyServer.length === 0) {
			console.log(
				`✓ ${raw}  ${expectedSet.size} bindings — local and server agree.`,
			);
		} else {
			mismatches++;
			console.log(
				`✖ ${raw}  local=${expectedSet.size}, server=${actualSet.size}`,
			);
			if (onlyLocal.length > 0) {
				console.log(`    only local (${onlyLocal.length}):`);
				for (const s of onlyLocal) console.log(`      - ${s}`);
			}
			if (onlyServer.length > 0) {
				console.log(`    only server (${onlyServer.length}):`);
				for (const s of onlyServer) console.log(`      + ${s}`);
			}
		}
	}

	console.log();
	if (mismatches === 0) {
		console.log("All canonical shapes agree.");
		process.exit(0);
	} else {
		console.error(`${mismatches} of ${testRefs.length} refs disagree.`);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
