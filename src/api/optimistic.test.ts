import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { restoreCaches, swapIntoCaches } from "./optimistic";

const item = (id: string, enabled: boolean) => ({
	metadata: { id, name: id },
	spec: { enabled },
});

describe("swapIntoCaches", () => {
	test("replaces the resource in every list and its own entry, then restores", () => {
		const qc = new QueryClient();
		qc.setQueryData(["keys"], { items: [item("a", true), item("b", true)] });
		qc.setQueryData(["keys", "list", { q: "a" }], { items: [item("a", true)] });
		qc.setQueryData(["keys", "list", { q: "b" }], { items: [item("b", true)] });
		qc.setQueryData(["keys", "a"], item("a", true));
		qc.setQueryData(["models"], { items: [item("a", true)] });

		const snapshot = swapIntoCaches(qc, ["keys"], item("a", false));

		expect(qc.getQueryData(["keys"])).toEqual({
			items: [item("a", false), item("b", true)],
		});
		expect(qc.getQueryData(["keys", "list", { q: "a" }])).toEqual({
			items: [item("a", false)],
		});
		expect(qc.getQueryData(["keys", "list", { q: "b" }])).toEqual({
			items: [item("b", true)],
		});
		expect(qc.getQueryData(["keys", "a"])).toEqual(item("a", false));
		expect(qc.getQueryData(["models"])).toEqual({ items: [item("a", true)] });

		restoreCaches(qc, snapshot);
		expect(qc.getQueryData(["keys", "a"])).toEqual(item("a", true));
		expect(qc.getQueryData(["keys"])).toEqual({
			items: [item("a", true), item("b", true)],
		});
	});
});
