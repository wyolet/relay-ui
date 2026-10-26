import { describe, expect, test } from "bun:test";
import {
	clearFilters,
	EXPLORER_DEFAULTS,
	explorerFilter,
	explorerSearchSchema,
} from "./search";

describe("clearFilters", () => {
	test("drops every filter and keeps the view", () => {
		const s = explorerSearchSchema.parse({
			lens: "spend",
			range: "month",
			group_by: "host_id",
			status_class: "5xx",
			model_id: ["m1"],
			team_id: ["t1", "t2"],
		});
		const cleared = clearFilters(s);
		expect(explorerFilter(cleared)).toEqual({});
		expect(cleared).toEqual({
			...EXPLORER_DEFAULTS,
			lens: "spend",
			range: "month",
			group_by: "host_id",
		});
	});
});
