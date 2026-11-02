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
		const hk = makeHostKey({ hostId: "ghost" });
		const ds = analyzeHostKey(hk, graph({ hostKeys: [hk] }));
		expect(codes(ds)).toContain("host-key.host-dangling");
	});

	it("warns when host is disabled", () => {
		const host = makeHost({ id: "h1", name: "openai", enabled: false });
		const hk = makeHostKey({ hostId: "h1" });
		const ds = analyzeHostKey(hk, graph({ hostKeys: [hk], hosts: [host] }));
		expect(codes(ds)).toContain("host-key.host-disabled");
	});

	it("info: orphan when no user policy has this credential in credentialIds", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		// policy doesn't reference k1 in credentialIds
		const policy = makePolicy({ id: "p1", credentialIds: [] });
		const ds = analyzeHostKey(
			hk,
			graph({ hostKeys: [hk], hosts: [host], policies: [policy] }),
		);
		expect(codes(ds)).toContain("host-key.orphan");
	});

	it("no orphan when a user policy has this credential in credentialIds", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const policy = makePolicy({ id: "p1", credentialIds: ["k1"] });
		const ds = analyzeHostKey(
			hk,
			graph({ hostKeys: [hk], hosts: [host], policies: [policy] }),
		);
		expect(codes(ds)).not.toContain("host-key.orphan");
	});

	it("info: disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({
			hostId: "h1",
			enabled: false,
		});
		const ds = analyzeHostKey(hk, graph({ hostKeys: [hk], hosts: [host] }));
		expect(codes(ds)).toContain("host-key.disabled");
	});
});
