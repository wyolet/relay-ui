import { describe, expect, it } from "bun:test";
import { analyzeRelayKey } from "@/diagnostics/analyzers/relayKey";
import {
	graph,
	makeHost,
	makeHostKey,
	makePolicy,
	makeRelayKey,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzeRelayKey", () => {
	it("flags policy-dangling when policy doesn't exist", () => {
		const rk = makeRelayKey({ policyId: "ghost" });
		const ds = analyzeRelayKey(rk, graph({ relayKeys: [rk] }));
		expect(codes(ds)).toContain("relay-key.policy-dangling");
	});

	it("flags policy-disabled (warn)", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({
			id: "p1",
			hostKeyIds: ["k1"],
			enabled: false,
		});
		const rk = makeRelayKey({ policyId: "p1" });
		const ds = analyzeRelayKey(
			rk,
			graph({
				policies: [p],
				hostKeys: [hk],
				hosts: [host],
				relayKeys: [rk],
			}),
		);
		const d = ds.find((x) => x.code === "relay-key.policy-disabled");
		expect(d?.severity).toBe("warn");
	});

	it("rolls up policy errors (no-host-keys) without duplicating message", () => {
		const p = makePolicy({ id: "p1", hostKeyIds: [] });
		const rk = makeRelayKey({ policyId: "p1" });
		const ds = analyzeRelayKey(rk, graph({ policies: [p], relayKeys: [rk] }));
		const rolled = ds.find((d) => d.code === "relay-key.policy-broken");
		expect(rolled?.severity).toBe("error");
	});

	it("info: key disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({ id: "p1", hostKeyIds: ["k1"] });
		const rk = makeRelayKey({ policyId: "p1", enabled: false });
		const ds = analyzeRelayKey(
			rk,
			graph({
				policies: [p],
				hostKeys: [hk],
				hosts: [host],
				relayKeys: [rk],
			}),
		);
		expect(codes(ds)).toContain("relay-key.disabled");
	});

	it("clean policy → only optional info-level diagnostics", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({ id: "p1", hostKeyIds: ["k1"] });
		const rk = makeRelayKey({ policyId: "p1" });
		const ds = analyzeRelayKey(
			rk,
			graph({
				policies: [p],
				hostKeys: [hk],
				hosts: [host],
				relayKeys: [rk],
			}),
		);
		// No errors, no warns.
		const bad = ds.filter(
			(d) => d.severity === "error" || d.severity === "warn",
		);
		expect(bad).toEqual([]);
	});
});
