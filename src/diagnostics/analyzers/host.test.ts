import { describe, expect, it } from "bun:test";
import { analyzeHost } from "@/diagnostics/analyzers/host";
import {
	bindingTo,
	graph,
	makeHost,
	makeHostKey,
	makeModel,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzeHost", () => {
	it("warns when disabled but still referenced", () => {
		const host = makeHost({ id: "h1", name: "openai", enabled: false });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const ds = analyzeHost(host, graph({ hosts: [host], hostKeys: [hk] }));
		expect(codes(ds)).toContain("host.disabled-with-refs");
	});

	it("info: no keys registered", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const ds = analyzeHost(host, graph({ hosts: [host] }));
		expect(codes(ds)).toContain("host.no-keys");
	});

	it("does not flag no-keys for a noAuth host", () => {
		const host = makeHost({ id: "h1", name: "ollama-self", noAuth: true });
		const ds = analyzeHost(host, graph({ hosts: [host] }));
		expect(codes(ds)).not.toContain("host.no-keys");
	});

	it("info: no model bindings", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const ds = analyzeHost(host, graph({ hosts: [host] }));
		expect(codes(ds)).toContain("host.no-bindings");
	});

	it("clean: a host with keys and bindings has no diagnostics", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const hk = makeHostKey({ id: "k1", hostId: "h1" });
		const model = makeModel({ name: "gpt-4o" });
		const ds = analyzeHost(
			host,
			graph({
				hosts: [host],
				hostKeys: [hk],
				models: [model],
				bindings: [bindingTo(model, "h1")],
			}),
		);
		expect(ds).toEqual([]);
	});
});
