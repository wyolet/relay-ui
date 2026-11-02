import { describe, expect, it } from "bun:test";
import { analyzeKey } from "@/diagnostics/analyzers/key";
import { graph, makeKey } from "@/diagnostics/fixtures";

const codes = (ds: { code: string }[]) => ds.map((d) => d.code).sort();

describe("analyzeKey", () => {
	it("info: key disabled", () => {
		const rk = makeKey({ enabled: false });
		const ds = analyzeKey(rk, graph({ keys: [rk] }));
		expect(codes(ds)).toContain("key.disabled");
	});

	it("enabled key has no diagnostics", () => {
		const rk = makeKey({});
		const ds = analyzeKey(rk, graph({ keys: [rk] }));
		expect(ds).toEqual([]);
	});
});
