import { describe, expect, it } from "bun:test";
import { analyzeHostKey } from "@/diagnostics/analyzers/hostKey";
import {
	graph,
	makeHost,
	makeHostKey,
	makePolicy,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzeHostKey", () => {
	it("flags host-dangling", () => {
		const hk = makeHostKey({ hostId: "ghost", policyId: "p1" });
		const ds = analyzeHostKey(hk, graph({ hostKeys: [hk] }));
		expect(codes(ds)).toContain("host-key.host-dangling");
	});

	it("flags host-policy-dangling", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ hostId: "h1", policyId: "ghost" });
		const ds = analyzeHostKey(hk, graph({ hostKeys: [hk], hosts: [host] }));
		expect(codes(ds)).toContain("host-key.host-policy-dangling");
	});

	it("warns when host is disabled", () => {
		const host = makeHost({ id: "h1", name: "openai", enabled: false });
		const policy = makePolicy({ id: "p1" });
		const hk = makeHostKey({ hostId: "h1", policyId: "p1" });
		const ds = analyzeHostKey(
			hk,
			graph({ hostKeys: [hk], hosts: [host], policies: [policy] }),
		);
		expect(codes(ds)).toContain("host-key.host-disabled");
	});

	it("warns when host policy is disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const policy = makePolicy({ id: "p1", enabled: false });
		const hk = makeHostKey({ hostId: "h1", policyId: "p1" });
		const ds = analyzeHostKey(
			hk,
			graph({ hostKeys: [hk], hosts: [host], policies: [policy] }),
		);
		expect(codes(ds)).toContain("host-key.host-policy-disabled");
	});

	it("info: orphan when no user policy references the host key", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const policy = makePolicy({ id: "p1" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const ds = analyzeHostKey(
			hk,
			graph({ hostKeys: [hk], hosts: [host], policies: [policy] }),
		);
		expect(codes(ds)).toContain("host-key.orphan");
	});

	it("info: disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const policy = makePolicy({ id: "p1" });
		const hk = makeHostKey({
			hostId: "h1",
			policyId: "p1",
			enabled: false,
		});
		const ds = analyzeHostKey(
			hk,
			graph({ hostKeys: [hk], hosts: [host], policies: [policy] }),
		);
		expect(codes(ds)).toContain("host-key.disabled");
	});
});
