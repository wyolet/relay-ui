import { describe, expect, it } from "bun:test";
import type { Model } from "@/api/types/model";
import {
	distinctProductLines,
	groupModelsByFamily,
} from "./groupModelsByFamily";

function model(name: string, family?: string, productLine?: string): Model {
	return {
		metadata: { name },
		spec: { pointer: "", snapshots: null, family, productLine },
	};
}

const names = (ms: readonly Model[]) => ms.map((m) => m.metadata.name);

describe("groupModelsByFamily", () => {
	it("sub-groups lined models and lists unlined ones first", () => {
		const [claude] = groupModelsByFamily([
			model("claude-sonnet-4-6", "claude", "sonnet"),
			model("claude-instant", "claude"),
			model("claude-opus-5-5", "claude", "opus"),
			model("claude-sonnet-5-5", "claude", "sonnet"),
		]);
		expect(claude?.family).toBe("claude");
		expect(claude?.count).toBe(4);
		expect(names(claude?.unlined ?? [])).toEqual(["claude-instant"]);
		expect(claude?.lines.map((l) => l.line)).toEqual(["sonnet", "opus"]);
		expect(names(claude?.lines[0]?.models ?? [])).toEqual([
			"claude-sonnet-4-6",
			"claude-sonnet-5-5",
		]);
	});

	it("orders families and lines by size, then name", () => {
		const groups = groupModelsByFamily([
			model("gemini-pro", "gemini", "pro"),
			model("gemini-flash", "gemini", "flash"),
			model("gpt-6", "gpt"),
			model("gpt-6-mini", "gpt"),
			model("llama", "llama"),
			model("grok", "grok"),
		]);
		expect(groups.map((g) => g.family)).toEqual([
			"gemini",
			"gpt",
			"grok",
			"llama",
		]);
		expect(groups[0]?.lines.map((l) => l.line)).toEqual(["flash", "pro"]);
	});

	it("files models without a family under Other and ignores blank lines", () => {
		const [other] = groupModelsByFamily([model("mystery", "  ", " ")]);
		expect(other?.family).toBe("Other");
		expect(other?.lines).toEqual([]);
		expect(names(other?.unlined ?? [])).toEqual(["mystery"]);
	});
});

describe("distinctProductLines", () => {
	it("returns each non-blank line once, alphabetically", () => {
		expect(
			distinctProductLines([
				model("a", "gemini", "pro"),
				model("b", "gemini", "flash-lite"),
				model("c", "gemini", "pro"),
				model("d", "gpt"),
				model("e", "claude", " "),
			]),
		).toEqual(["flash-lite", "pro"]);
	});
});
