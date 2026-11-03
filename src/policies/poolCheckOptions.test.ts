import { describe, expect, it } from "bun:test";
import { poolCheckOptions } from "@/policies/poolCheckOptions";
import type { LinkChoice } from "@/policies/usePolicyLinkChoices";

function pool(id: string): LinkChoice {
	return { id, name: id, label: `Pool ${id}`, meta: `host · ${id}` };
}

describe("poolCheckOptions", () => {
	it("lists usable pools in order, ranking linked ones by link order", () => {
		const options = poolCheckOptions({
			usable: [pool("a"), pool("b"), pool("c")],
			linked: [pool("c"), pool("a")],
			warnings: new Map(),
			unavailable: undefined,
		});
		expect(options).toEqual([
			{ value: "a", label: "Pool a", hint: "host · a", rank: 2 },
			{ value: "b", label: "Pool b", hint: "host · b" },
			{ value: "c", label: "Pool c", hint: "host · c", rank: 1 },
		]);
	});

	it("keeps linked pools outside the usable list, flagged and warned", () => {
		const options = poolCheckOptions({
			usable: [pool("a")],
			linked: [pool("a"), pool("gone")],
			warnings: new Map([["a", ["host off"]]]),
			unavailable: { ids: ["gone"], scope: "Team Platform" },
		});
		expect(options.map((o) => [o.value, o.rank, o.notes])).toEqual([
			["a", 1, ["host off"]],
			["gone", 2, ["Not available in Team Platform"]],
		]);
	});
});
