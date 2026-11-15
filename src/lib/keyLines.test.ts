import { describe, expect, it } from "bun:test";
import type { Key } from "@/api/types/key";
import {
	type KeyLine,
	keyExpiry,
	principalName,
	sortKeyLines,
} from "./keyLines";

const NOW = Date.parse("2026-11-15T12:00:00Z");
const DAY = 24 * 60 * 60_000;

function line(
	name: string,
	opts: {
		createdAt?: string;
		expiresAt?: string;
		usd?: number | null;
		requests?: number;
	} = {},
): KeyLine {
	const key: Key = {
		metadata: { name, createdAt: opts.createdAt },
		spec: {
			keyHash: name,
			principal: { id: "p", kind: "user" },
			expiresAt: opts.expiresAt,
		},
	};
	return opts.requests == null
		? { key }
		: { key, usage: { requests: opts.requests, usd: opts.usd ?? null } };
}

const names = (lines: KeyLine[]) => lines.map((l) => l.key.metadata.name);

describe("sortKeyLines", () => {
	it("usage: spend, then requests; idle keys last, by name", () => {
		const lines = [
			line("idle-b"),
			line("cheap", { usd: 1, requests: 900 }),
			line("idle-a"),
			line("dear", { usd: 40, requests: 10 }),
			line("unpriced", { usd: null, requests: 50 }),
		];
		expect(names(sortKeyLines(lines, { key: "usage", dir: "desc" }))).toEqual([
			"dear",
			"cheap",
			"unpriced",
			"idle-a",
			"idle-b",
		]);
	});

	it("last used: most recent first; unused keys stay last either way", () => {
		const lines = [
			{ ...line("never"), lastUsed: undefined },
			{ ...line("old"), lastUsed: "2026-11-01T00:00:00Z" },
			{ ...line("fresh"), lastUsed: "2026-11-15T10:00:00Z" },
		];
		expect(names(sortKeyLines(lines, { key: "used", dir: "desc" }))).toEqual([
			"fresh",
			"old",
			"never",
		]);
		expect(names(sortKeyLines(lines, { key: "used", dir: "asc" }))).toEqual([
			"old",
			"fresh",
			"never",
		]);
	});

	it("newest and name follow the direction", () => {
		const lines = [
			line("b", { createdAt: "2026-01-02T00:00:00Z" }),
			line("a", { createdAt: "2026-03-01T00:00:00Z" }),
			line("c", { createdAt: "2025-12-01T00:00:00Z" }),
		];
		expect(names(sortKeyLines(lines, { key: "newest", dir: "desc" }))).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(names(sortKeyLines(lines, { key: "name", dir: "asc" }))).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(names(sortKeyLines(lines, { key: "name", dir: "desc" }))).toEqual([
			"c",
			"b",
			"a",
		]);
	});

	it("expires: soonest first; keys that never expire stay last", () => {
		const lines = [
			line("never"),
			line("late", { expiresAt: "2027-01-01T00:00:00Z" }),
			line("soon", { expiresAt: "2026-11-20T00:00:00Z" }),
		];
		expect(names(sortKeyLines(lines, { key: "expires", dir: "asc" }))).toEqual([
			"soon",
			"late",
			"never",
		]);
		expect(names(sortKeyLines(lines, { key: "expires", dir: "desc" }))).toEqual(
			["late", "soon", "never"],
		);
	});
});

describe("keyExpiry", () => {
	const at = (ms: number) => new Date(NOW + ms).toISOString();

	it("reads in words, with a tone", () => {
		expect(keyExpiry(undefined, NOW)).toEqual({ text: "Never", tone: "never" });
		expect(keyExpiry(at(-1), NOW)).toEqual({
			text: "Expired",
			tone: "expired",
		});
		expect(keyExpiry(at(20 * 60_000), NOW)).toEqual({
			text: "in under an hour",
			tone: "soon",
		});
		expect(keyExpiry(at(5 * 60 * 60_000), NOW).text).toBe("in 5 hours");
		expect(keyExpiry(at(DAY), NOW).text).toBe("in 1 day");
		expect(keyExpiry(at(12 * DAY), NOW)).toEqual({
			text: "in 12 days",
			tone: "later",
		});
		expect(keyExpiry(at(90 * DAY), NOW).text).toBe("in 3 months");
		expect(keyExpiry(at(800 * DAY), NOW).text).toBe("in 2 years");
	});
});

describe("principalName", () => {
	const labels = new Map([["sa-1", "Builder"]]);

	it("prefers the server's name, then the account label, then a short id", () => {
		expect(
			principalName({ id: "sa-1", kind: "serviceaccount", name: "ci" }, labels),
		).toBe("ci");
		expect(principalName({ id: "sa-1", kind: "serviceaccount" }, labels)).toBe(
			"Builder",
		);
		expect(principalName({ id: "abcdef123", kind: "user" }, labels)).toBe(
			"abcdef…",
		);
	});
});
