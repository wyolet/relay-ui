import { describe, expect, it } from "bun:test";
import { analyzeKey } from "@/diagnostics/analyzers/key";
import {
	graph,
	makeHost,
	makeHostKey,
	makeKey,
	makePolicy,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzeKey", () => {
	it("flags policy-dangling when policy doesn't exist", () => {
		const rk = makeKey({ policyId: "ghost" });
		const ds = analyzeKey(rk, graph({ keys: [rk] }));
		expect(codes(ds)).toContain("key.policy-dangling");
	});

	it("flags policy-disabled (warn)", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({
			id: "p1",
			hostKeyIds: ["k1"],
			enabled: false,
		});
		const rk = makeKey({ policyId: "p1" });
		const ds = analyzeKey(
			rk,
			graph({
				policies: [p],
				hostKeys: [hk],
				hosts: [host],
				keys: [rk],
			}),
		);
		const d = ds.find((x) => x.code === "key.policy-disabled");
		expect(d?.severity).toBe("warn");
	});

	it("rolls up policy errors (no-host-keys) without duplicating message", () => {
		const p = makePolicy({ id: "p1", hostKeyIds: [] });
		const rk = makeKey({ policyId: "p1" });
		const ds = analyzeKey(rk, graph({ policies: [p], keys: [rk] }));
		const rolled = ds.find((d) => d.code === "key.policy-broken");
		expect(rolled?.severity).toBe("error");
	});

	it("info: key disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({ id: "p1", hostKeyIds: ["k1"] });
		const rk = makeKey({ policyId: "p1", enabled: false });
		const ds = analyzeKey(
			rk,
			graph({
				policies: [p],
				hostKeys: [hk],
				hosts: [host],
				keys: [rk],
			}),
		);
		expect(codes(ds)).toContain("key.disabled");
	});

	it("clean policy → only optional info-level diagnostics", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const p = makePolicy({ id: "p1", hostKeyIds: ["k1"] });
		const rk = makeKey({ policyId: "p1" });
		const ds = analyzeKey(
			rk,
			graph({
				policies: [p],
				hostKeys: [hk],
				hosts: [host],
				keys: [rk],
			}),
		);
		// No errors, no warns.
		const bad = ds.filter(
			(d) => d.severity === "error" || d.severity === "warn",
		);
		expect(bad).toEqual([]);
	});
});
