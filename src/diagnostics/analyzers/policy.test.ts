import { describe, expect, it } from "bun:test";
import { analyzePolicy } from "@/diagnostics/analyzers/policy";
import {
	graph,
	makeHost,
	makeHostKey,
	makeModel,
	makePolicy,
	makeProvider,
	makeRateLimit,
	makeRelayKey,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzePolicy", () => {
	it("flags no host keys", () => {
		const p = makePolicy({ hostKeyIds: [] });
		const ds = analyzePolicy(p, graph({ policies: [p] }));
		expect(codes(ds)).toContain("policy.no-host-keys");
	});

	it("flags all-host-keys-disabled when every attached key is off", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({
			id: "k1",
			hostId: "h1",
			policyId: "p1",
			enabled: false,
		});
		const p = makePolicy({ id: "p1", hostKeyIds: ["k1"] });
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [hk], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.host-keys-all-disabled");
	});

	it("warns when only some host keys are disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const a = makeHostKey({ id: "a", hostId: "h1", policyId: "p1" });
		const b = makeHostKey({
			id: "b",
			hostId: "h1",
			policyId: "p1",
			enabled: false,
		});
		const p = makePolicy({ id: "p1", hostKeyIds: ["a", "b"] });
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [a, b], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.host-keys-degraded");
	});

	it("flags transitive host-disabled when every enabled hk's host is off", () => {
		const host = makeHost({ id: "h1", name: "openai", enabled: false });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({ id: "p1", hostKeyIds: ["k1"] });
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [hk], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.host-disabled-transitive");
	});

	it("warns when a referenced rate limit is disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const rl = makeRateLimit({ id: "rl1", enabled: false });
		const p = makePolicy({
			id: "p1",
			hostKeyIds: ["k1"],
			rateLimitId: "rl1",
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

	it("warns about rl-binding pointing at models outside the catalog", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({
			id: "p1",
			hostKeyIds: ["k1"],
			models: ["openai/gpt-4o"],
			rlBindings: [
				{ rateLimitId: "rl1", models: ["anthropic/claude-3-haiku"] },
			],
		});
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [hk], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.rl-binding-dead");
	});

	it("warns when disabled but enabled relay keys attached", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({
			id: "p1",
			hostKeyIds: ["k1"],
			enabled: false,
		});
		const rk = makeRelayKey({ policyId: "p1" });
		const ds = analyzePolicy(
			p,
			graph({
				policies: [p],
				hostKeys: [hk],
				hosts: [host],
				relayKeys: [rk],
			}),
		);
		expect(codes(ds)).toContain("policy.disabled-with-relay-keys");
	});

	it("skips host-key and relay-key checks for host-owned policies", () => {
		// Host-owned (tier) policy with no hostKeyIds — would normally trigger
		// policy.no-host-keys, but tier policies don't pool host keys.
		const tier: ReturnType<typeof makePolicy> = {
			...makePolicy({ id: "tier-1", name: "anthropic-tier-1", hostKeyIds: [] }),
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
		expect(c).not.toContain("policy.no-relay-keys");
		expect(c).not.toContain("policy.disabled-with-relay-keys");
	});

	it("info: no relay keys attached", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({ id: "p1", hostKeyIds: ["k1"] });
		const ds = analyzePolicy(
			p,
			graph({ policies: [p], hostKeys: [hk], hosts: [host] }),
		);
		expect(codes(ds)).toContain("policy.no-relay-keys");
	});

	describe("catalog coverage", () => {
		// Provider UUID → slug resolution: this is what the false-negative fix
		// targets. The model's owner.id is a UUID; the ref's provider segment
		// is the slug. The graph must translate.
		const PROV = "019e240d-2501-7680-bbfe-096abc9ba34f";

		it("matches grants through the provider UUID → slug map", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			const model = makeModel({
				name: "gpt-4o",
				providerId: PROV,
				bindings: [{ hostId: "h1" }],
			});
			const p = makePolicy({
				id: "p1",
				hostKeyIds: ["k1"],
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
				}),
			);
			expect(codes(ds)).not.toContain("policy.catalog-resolves-empty");
		});

		it("flags error when every grant resolves to no reachable model", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			// Model exists but binds to a host the policy can't reach.
			const otherHost = makeHost({ id: "h2", name: "azure" });
			const model = makeModel({
				name: "gpt-4o",
				providerId: PROV,
				bindings: [{ hostId: "h2" }],
			});
			const p = makePolicy({
				id: "p1",
				hostKeyIds: ["k1"],
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
				}),
			);
			const cat = ds.find((d) => d.code === "policy.catalog-resolves-empty");
			expect(cat?.severity).toBe("error");
		});

		it("warns when some grants are dead", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			const live = makeModel({
				name: "gpt-4o",
				providerId: PROV,
				bindings: [{ hostId: "h1" }],
			});
			const p = makePolicy({
				id: "p1",
				hostKeyIds: ["k1"],
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
				}),
			);
			const cat = ds.find((d) => d.code === "policy.catalog-resolves-empty");
			expect(cat?.severity).toBe("warn");
		});

		it("disabled models don't count as reachable", () => {
			const host = makeHost({ id: "h1", name: "openai" });
			const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
			const provider = makeProvider({ id: PROV, name: "openai" });
			const model = makeModel({
				name: "gpt-4o",
				providerId: PROV,
				enabled: false,
				bindings: [{ hostId: "h1" }],
			});
			const p = makePolicy({
				id: "p1",
				hostKeyIds: ["k1"],
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
				}),
			);
			expect(codes(ds)).toContain("policy.catalog-resolves-empty");
		});
	});
});
