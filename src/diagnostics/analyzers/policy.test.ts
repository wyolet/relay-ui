import { describe, expect, it } from "bun:test";
import { analyzePolicy } from "@/diagnostics/analyzers/policy";
import {
	bindingTo,
	graph,
	makeAccount,
	makeHost,
	makeHostKey,
	makeModel,
	makePolicy,
	makePool,
	makeProvider,
	makeRateLimit,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

// The one pool most tests link: pool-1 at host h1 holding the given keys.
const poolOf = (credentialIds: string[]) =>
	makePool({ id: "pool-1", hostId: "h1", credentialIds });

describe("analyzePolicy", () => {
	it("only notes a policy that links no pools; reach is left to others", () => {
		const p = makePolicy({ poolIds: [], models: ["openai/gpt-4o"] });
		const ds = analyzePolicy(p, graph({ policies: [p] }));
		const note = ds.find((d) => d.code === "policy.no-host-keys");
		expect(note?.severity).toBe("info");
		expect(codes(ds)).not.toContain("policy.catalog-resolves-empty");
	});

	it("counts the keys of linked pools as the policy's credentials", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const provider = makeProvider({ id: "prov-openai", name: "openai" });
		const model = makeModel({ name: "gpt-4o", providerId: "prov-openai" });
		const p = makePolicy({ poolIds: ["pool-1"], models: ["openai"] });
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				pools: [poolOf(["k1"])],
				hostKeys: [hk],
				hosts: [host],
				models: [model],
				providers: [provider],
				bindings: [bindingTo(model, "h1")],
			}),
		);
		expect(codes(ds)).not.toContain("policy.no-host-keys");
		expect(codes(ds)).not.toContain("policy.catalog-resolves-empty");
	});

	// An Anthropic setup reached only through a pool's account.
	const anthropic = () => {
		const host = makeHost({ id: "h1", name: "anthropic" });
		const provider = makeProvider({ id: "prov-a", name: "anthropic" });
		const model = makeModel({ name: "claude", providerId: "prov-a" });
		return {
			hosts: [host],
			providers: [provider],
			models: [model],
			bindings: [bindingTo(model, "h1")],
		};
	};
	const accountPool = makePool({
		id: "pool-1",
		hostId: "h1",
		accountIds: ["acc-1"],
	});

	it("counts the keys of a pool's account as the policy's credentials", () => {
		const p = makePolicy({ poolIds: ["pool-1"], models: ["anthropic"] });
		const ds = analyzePolicy(
			p,
			graph({
				...anthropic(),
				policies: [p],
				pools: [accountPool],
				accounts: [makeAccount({ id: "acc-1", hostId: "h1" })],
				hostKeys: [makeHostKey({ id: "k1", hostId: "h1", accountId: "acc-1" })],
			}),
		);
		expect(codes(ds)).not.toContain("policy.no-host-keys");
		expect(codes(ds)).not.toContain("policy.catalog-resolves-empty");
	});

	it("counts a shared account in a pool as serving, its keys unlisted", () => {
		const p = makePolicy({ poolIds: ["pool-1"], models: ["anthropic"] });
		const ds = analyzePolicy(
			p,
			graph({
				...anthropic(),
				policies: [p],
				pools: [accountPool],
				accounts: [
					makeAccount({ id: "acc-1", hostId: "h1", sourceAccountId: "real" }),
				],
			}),
		);
		expect(codes(ds)).not.toContain("policy.no-host-keys");
		expect(codes(ds)).not.toContain("policy.catalog-resolves-empty");
	});

	it("still flags an own account in a pool that holds no keys", () => {
		const p = makePolicy({ poolIds: ["pool-1"], models: ["anthropic"] });
		const ds = analyzePolicy(
			p,
			graph({
				...anthropic(),
				policies: [p],
				pools: [accountPool],
				accounts: [makeAccount({ id: "acc-1", hostId: "h1" })],
			}),
		);
		expect(ds.find((d) => d.code === "policy.no-host-keys")?.severity).toBe(
			"error",
		);
	});

	it("flags no credentials when a linked pool is missing", () => {
		const p = makePolicy({ poolIds: ["pool-gone"] });
		const ds = analyzePolicy(p, graph({ policies: [p] }));
		const err = ds.find((d) => d.code === "policy.no-host-keys");
		expect(err?.severity).toBe("error");
	});

	it("reaches a keyless host through a pool at it", () => {
		const host = makeHost({ id: "h1", name: "ollama-self", noAuth: true });
		const provider = makeProvider({ id: "pr1", name: "ollama" });
		const model = makeModel({ id: "m1", name: "llama3", providerId: "pr1" });
		const p = makePolicy({ poolIds: ["pool-1"], models: ["ollama"] });
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				pools: [poolOf([])],
				hosts: [host],
				providers: [provider],
				models: [model],
				bindings: [bindingTo(model, "h1")],
			}),
		);
		expect(codes(ds)).not.toContain("policy.no-host-keys");
		expect(codes(ds)).not.toContain("policy.catalog-resolves-empty");
	});

	it("flags all-credentials-disabled when every pooled credential is off", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", enabled: false });
		const p = makePolicy({ id: "p1", poolIds: ["pool-1"] });
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				pools: [poolOf(["k1"])],
				hostKeys: [hk],
				hosts: [host],
			}),
		);
		expect(codes(ds)).toContain("policy.host-keys-all-disabled");
	});

	it("warns when only some credentials are disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const a = makeHostKey({ id: "a", hostId: "h1" });
		const b = makeHostKey({ id: "b", hostId: "h1", enabled: false });
		const p = makePolicy({ id: "p1", poolIds: ["pool-1"] });
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				pools: [poolOf(["a", "b"])],
				hostKeys: [a, b],
				hosts: [host],
			}),
		);
		expect(codes(ds)).toContain("policy.host-keys-degraded");
	});

	it("flags transitive host-disabled when every enabled credential's host is off", () => {
		const host = makeHost({ id: "h1", name: "openai", enabled: false });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const p = makePolicy({ id: "p1", poolIds: ["pool-1"] });
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				pools: [poolOf(["k1"])],
				hostKeys: [hk],
				hosts: [host],
			}),
		);
		expect(codes(ds)).toContain("policy.host-disabled-transitive");
	});

	it("warns when a referenced rate limit is disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const rl = makeRateLimit({ id: "rl1", enabled: false });
		const p = makePolicy({
			id: "p1",
			poolIds: ["pool-1"],
			rateLimits: [{ rateLimitId: "rl1" }],
		});
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				pools: [poolOf(["k1"])],
				hostKeys: [hk],
				hosts: [host],
				rateLimits: [rl],
			}),
		);
		expect(codes(ds)).toContain("policy.rate-limit-disabled");
	});

	it("warns about rl entry pointing at models outside the catalog", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const p = makePolicy({
			id: "p1",
			poolIds: ["pool-1"],
			models: ["openai/gpt-4o"],
			rateLimits: [
				{ rateLimitId: "rl1", models: ["anthropic/claude-3-haiku"] },
			],
		});
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				pools: [poolOf(["k1"])],
				hostKeys: [hk],
				hosts: [host],
			}),
		);
		expect(codes(ds)).toContain("policy.rl-binding-dead");
	});

	it("skips credential and pool checks for host-owned policies", () => {
		// A host-owned (tier) policy links no pools; that would normally note
		// policy.no-host-keys, but tier policies don't pool credentials.
		const tier: ReturnType<typeof makePolicy> = {
			...makePolicy({ id: "tier-1", name: "anthropic-tier-1" }),
			metadata: {
				id: "tier-1",
				name: "anthropic-tier-1",
				owner: { kind: "host", id: "host-1" },
			},
		};
		const ds = analyzePolicy(tier, graph({ policies: [tier] }));
		const c = codes(ds);
		expect(c).not.toContain("policy.no-host-keys");
		expect(c).not.toContain("policy.host-keys-all-disabled");
		expect(c).not.toContain("policy.host-keys-degraded");
		expect(c).not.toContain("policy.host-disabled-transitive");
	});

	describe("catalog coverage", () => {
		// The model's owner.id is a UUID; the ref's provider segment is the
		// slug. The graph must translate.
		const PROV = "019e240d-2501-7680-bbfe-096abc9ba34f";

		it("matches grants through the provider UUID → slug map", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			const model = makeModel({ name: "gpt-4o", providerId: PROV });
			const p = makePolicy({
				id: "p1",
				poolIds: ["pool-1"],
				models: ["openai/gpt-4o"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
					pools: [poolOf(["k1"])],
					hostKeys: [hk],
					hosts: [host],
					models: [model],
					providers: [provider],
					bindings: [bindingTo(model, "h1")],
				}),
			);
			expect(codes(ds)).not.toContain("policy.catalog-resolves-empty");
		});

		it("flags error when every grant resolves to no reachable model", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			// Model exists but binds to a host the policy's pools don't reach.
			const otherHost = makeHost({ id: "h2", name: "azure" });
			const model = makeModel({ name: "gpt-4o", providerId: PROV });
			const p = makePolicy({
				id: "p1",
				poolIds: ["pool-1"],
				models: ["openai/gpt-4o"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
					pools: [poolOf(["k1"])],
					hostKeys: [hk],
					hosts: [host, otherHost],
					models: [model],
					providers: [provider],
					bindings: [bindingTo(model, "h2")],
				}),
			);
			const cat = ds.find((d) => d.code === "policy.catalog-resolves-empty");
			expect(cat?.severity).toBe("error");
		});

		it("warns when some grants are dead", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			const live = makeModel({ name: "gpt-4o", providerId: PROV });
			const p = makePolicy({
				id: "p1",
				poolIds: ["pool-1"],
				models: ["openai/gpt-4o", "openai/does-not-exist"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
					pools: [poolOf(["k1"])],
					hostKeys: [hk],
					hosts: [host],
					models: [live],
					providers: [provider],
					bindings: [bindingTo(live, "h1")],
				}),
			);
			const cat = ds.find((d) => d.code === "policy.catalog-resolves-empty");
			expect(cat?.severity).toBe("warn");
		});

		it("disabled models don't count as reachable", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			const model = makeModel({
				name: "gpt-4o",
				providerId: PROV,
				enabled: false,
			});
			const p = makePolicy({
				id: "p1",
				poolIds: ["pool-1"],
				models: ["openai/gpt-4o"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
					pools: [poolOf(["k1"])],
					hostKeys: [hk],
					hosts: [host],
					models: [model],
					providers: [provider],
					bindings: [bindingTo(model, "h1")],
				}),
			);
			expect(codes(ds)).toContain("policy.catalog-resolves-empty");
		});

		it("counts deprecated models toward unthrottled reach", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			const model = makeModel({
				name: "gpt-4",
				providerId: PROV,
				deprecated: true,
			});
			const p = makePolicy({
				id: "p1",
				poolIds: ["pool-1"],
				models: ["openai"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
					pools: [poolOf(["k1"])],
					hostKeys: [hk],
					hosts: [host],
					models: [model],
					providers: [provider],
					bindings: [bindingTo(model, "h1")],
				}),
			);
			expect(codes(ds)).toContain("policy.models-unthrottled");
		});
	});
});
