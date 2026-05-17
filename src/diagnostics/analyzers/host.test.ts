import { describe, expect, it } from "bun:test";
import { analyzeHost } from "@/diagnostics/analyzers/host";
import {
	graph,
	makeHost,
	makeHostKey,
	makeModel,
	makePolicy,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzeHost", () => {
	it("warns when disabled but still referenced", () => {
		const host = makeHost({ id: "h1", name: "openai", enabled: false });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const ds = analyzeHost(host, graph({ hosts: [host], hostKeys: [hk] }));
		expect(codes(ds)).toContain("host.disabled-with-refs");
	});

	it("warns when default policy id no longer resolves", () => {
		const host = makeHost({
			id: "h1",
			name: "openai",
			defaultPolicy: "ghost-policy-id",
		});
		const ds = analyzeHost(host, graph({ hosts: [host] }));
		expect(codes(ds)).toContain("host.default-policy-dangling");
	});

	it("doesn't fire when default policy id resolves", () => {
		const policy = makePolicy({ id: "p-real" });
		const host = makeHost({
			id: "h1",
			name: "openai",
			defaultPolicy: "p-real",
		});
		const ds = analyzeHost(host, graph({ hosts: [host], policies: [policy] }));
		expect(codes(ds)).not.toContain("host.default-policy-dangling");
	});

	it("info: no keys registered", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const ds = analyzeHost(host, graph({ hosts: [host] }));
		expect(codes(ds)).toContain("host.no-keys");
	});

	it("info: no model bindings", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const ds = analyzeHost(host, graph({ hosts: [host] }));
		expect(codes(ds)).toContain("host.no-bindings");
	});

	it("clean: a host with keys and bindings has no diagnostics", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1", policyId: "p1" });
		const model = makeModel({
			name: "gpt-4o",
			bindings: [{ hostId: "h1" }],
		});
		const ds = analyzeHost(
			host,
			graph({ hosts: [host], hostKeys: [hk], models: [model] }),
		);
		expect(ds).toEqual([]);
	});
});
