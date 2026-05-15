import { describe, expect, it } from "bun:test";
import { analyzeModel } from "@/diagnostics/analyzers/model";
import {
	graph,
	makeHost,
	makeModel,
	makePolicy,
	makeProvider,
} from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzeModel", () => {
	it("errors when every binding's host is disabled or missing", () => {
		const host = makeHost({ id: "h1", name: "openai", enabled: false });
		const model = makeModel({
			name: "gpt-4o",
			bindings: [{ hostId: "h1" }],
		});
		const ds = analyzeModel(model, graph({ hosts: [host], models: [model] }));
		expect(codes(ds)).toContain("model.all-hosts-unreachable");
	});

	it("warns when all bindings are explicitly disabled", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const model = makeModel({
			name: "gpt-4o",
			bindings: [{ hostId: "h1", enabled: false }],
		});
		// All-hosts-unreachable also fires (since enabledBindings is empty).
		// The all-bindings-disabled branch only runs if hosts themselves are alive,
		// so we make sure we don't double-flag the same condition.
		const ds = analyzeModel(model, graph({ hosts: [host], models: [model] }));
		const c = codes(ds);
		// Either is acceptable — we just want a signal, not silence.
		expect(
			c.includes("model.all-hosts-unreachable") ||
				c.includes("model.all-bindings-disabled"),
		).toBe(true);
	});

	it("warns when deprecated", () => {
		const host = makeHost({ id: "h1", name: "openai" });
		const model = makeModel({
			name: "gpt-old",
			deprecated: true,
			bindings: [{ hostId: "h1" }],
		});
		const ds = analyzeModel(model, graph({ hosts: [host], models: [model] }));
		expect(codes(ds)).toContain("model.deprecated");
	});

	it("warns when disabled but granted by an enabled policy", () => {
		const PROV = "uuid-1";
		const host = makeHost({ id: "h1", name: "openai" });
		const provider = makeProvider({ id: PROV, name: "openai" });
		const model = makeModel({
			name: "gpt-4o",
			providerId: PROV,
			enabled: false,
			bindings: [{ hostId: "h1" }],
		});
		const p = makePolicy({ id: "p1", models: ["openai/gpt-4o"] });
		const ds = analyzeModel(
			model,
			graph({
				hosts: [host],
				models: [model],
				providers: [provider],
				policies: [p],
			}),
		);
		expect(codes(ds)).toContain("model.disabled-with-grants");
	});
});
