import { describe, expect, it } from "bun:test";
import { analyzePolicy } from "@/diagnostics/analyzers/policy";
import {
	bindingTo,
	graph,
	makeHost,
	makeHostKey,
	makeModel,
	makePolicy,
	makePool,
	makeProvider,
	makeRateLimit,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzePolicy", () => {
	it("flags no credentials or pools", () => {
		const p = makePolicy({ credentialIds: [], poolIds: [] });
		const ds = analyzePolicy(p, graph({ policies: [p] }));
		expect(codes(ds)).toContain("policy.no-host-keys");
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
				pools: [
					makePool({ id: "pool-1", hostId: "h1", credentialIds: ["k1"] }),
				],
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

	it("flags no credentials when a linked pool is missing", () => {
		const p = makePolicy({ credentialIds: [], poolIds: ["pool-gone"] });
		const ds = analyzePolicy(p, graph({ policies: [p] }));
		expect(codes(ds)).toContain("policy.no-host-keys");
	});

	it("does not flag no-credentials when a grant reaches a noAuth host", () => {
		const host = makeHost({ id: "h1", name: "ollama-self", noAuth: true });
		const provider = makeProvider({ id: "pr1", name: "ollama" });
		const model = makeModel({ id: "m1", name: "llama3", providerId: "pr1" });
		const p = makePolicy({
			id: "p1",
			credentialIds: [],
			poolIds: [],
			models: ["@ollama-self"],
		});
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				hosts: [host],
				providers: [provider],
				models: [model],
				bindings: [bindingTo(model, "h1")],
			}),
		);
		expect(codes(ds)).not.toContain("policy.no-host-keys");
		expect(codes(ds)).not.toContain("policy.catalog-resolves-empty");
	});

	it("flags all-credentials-disabled when every attached credential is off", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({
			id: "k1",
			hostId: "h1",
			enabled: false,
		});
		const p = makePolicy({ id: "p1", credentialIds: ["k1"] });
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [hk], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.host-keys-all-disabled");
	});

	it("warns when only some credentials are disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const a = makeHostKey({ id: "a", hostId: "h1" });
		const b = makeHostKey({
			id: "b",
			hostId: "h1",
			enabled: false,
		});
		const p = makePolicy({ id: "p1", credentialIds: ["a", "b"] });
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [a, b], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.host-keys-degraded");
	});

	it("flags transitive host-disabled when every enabled credential's host is off", () => {
		const host = makeHost({ id: "h1", name: "openai", enabled: false });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const p = makePolicy({ id: "p1", credentialIds: ["k1"] });
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [hk], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.host-disabled-transitive");
	});

	it("warns when a referenced rate limit is disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const rl = makeRateLimit({ id: "rl1", enabled: false });
		const p = makePolicy({
			id: "p1",
			credentialIds: ["k1"],
			rateLimits: [{ rateLimitId: "rl1" }],
		});
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
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
			credentialIds: ["k1"],
			models: ["openai/gpt-4o"],
			rateLimits: [
				{ rateLimitId: "rl1", models: ["anthropic/claude-3-haiku"] },
			],
		});
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [hk], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.rl-binding-dead");
	});

	it("skips credential and pool checks for host-owned policies", () => {
		// Host-owned (tier) policy with no credentialIds — would normally trigger
		// policy.no-host-keys, but tier policies don't pool credentials.
		const tier: ReturnType<typeof makePolicy> = {
			...makePolicy({
				id: "tier-1",
				name: "anthropic-tier-1",
				credentialIds: [],
			}),
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
		// Provider UUID → slug resolution: this is what the false-negative fix
		// targets. The model's owner.id is a UUID; the ref's provider segment
		// is the slug. The graph must translate.
		const PROV = "019e240d-2501-7680-bbfe-096abc9ba34f";

		it("matches grants through the provider UUID → slug map", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			const model = makeModel({
				name: "gpt-4o",
				providerId: PROV,
			});
			const p = makePolicy({
				id: "p1",
				credentialIds: ["k1"],
				models: ["openai/gpt-4o"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
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
			// Model exists but binds to a host the policy can't reach.
			const otherHost = makeHost({ id: "h2", name: "azure" });
			const model = makeModel({
				name: "gpt-4o",
				providerId: PROV,
			});
			const p = makePolicy({
				id: "p1",
				credentialIds: ["k1"],
				models: ["openai/gpt-4o"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
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
			const live = makeModel({
				name: "gpt-4o",
				providerId: PROV,
			});
			const p = makePolicy({
				id: "p1",
				credentialIds: ["k1"],
				models: ["openai/gpt-4o", "openai/does-not-exist"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
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
				credentialIds: ["k1"],
				models: ["openai/gpt-4o"],
			});
			const ds = analyzePolicy(
				p,
				graph({
					policies: [p],
					hostKeys: [hk],
					hosts: [host],
					models: [model],
					providers: [provider],
					bindings: [bindingTo(model, "h1")],
				}),
			);
			expect(codes(ds)).toContain("policy.catalog-resolves-empty");
		});
	});
});
