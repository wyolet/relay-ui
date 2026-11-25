import { describe, expect, test } from "bun:test";
import {
	distinctModelCount,
	hostKeyState,
	sortByKeyState,
} from "@/policies/policyReachRows";

const key = { id: "k1", name: "key-1" };

function row(
	name: string,
	keyed: boolean,
	requirement: "required" | "optional",
) {
	return {
		host: { name, displayName: name.toUpperCase() },
		hostKeys: keyed ? [key] : null,
		requirement,
	};
}

describe("hostKeyState", () => {
	test("a host with a key is keyed whatever its requirement", () => {
		expect(hostKeyState(row("a", true, "required"))).toBe("keyed");
		expect(hostKeyState(row("a", true, "optional"))).toBe("keyed");
	});
	test("a keyless host breaks only when required", () => {
		expect(hostKeyState(row("a", false, "required"))).toBe("breaking");
		expect(hostKeyState(row("a", false, "optional"))).toBe("optional");
	});
});

describe("sortByKeyState", () => {
	test("breaking, then optional, then keyed, by label within each", () => {
		const sorted = sortByKeyState([
			row("keyed", true, "required"),
			row("opt", false, "optional"),
			row("b-break", false, "required"),
			row("a-break", false, "required"),
		]);
		expect(sorted.map((r) => r.host.name)).toEqual([
			"a-break",
			"b-break",
			"opt",
			"keyed",
		]);
	});
});

describe("distinctModelCount", () => {
	test("a model served by two hosts counts once", () => {
		const m = (provider: string, model: string) => ({
			provider: { name: provider },
			model: { name: model },
		});
		expect(
			distinctModelCount([
				m("anthropic", "claude"),
				m("anthropic", "claude"),
				m("google", "claude"),
			]),
		).toBe(2);
	});
});
