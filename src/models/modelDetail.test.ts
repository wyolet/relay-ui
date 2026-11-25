import { describe, expect, it } from "bun:test";
import type { Model } from "@/api/types/model";
import {
	activeCapabilities,
	deprecationNote,
	familyLabel,
	listedSnapshots,
	sortSnapshots,
	specFields,
} from "./modelDetail";

function model(spec: Partial<Model["spec"]> = {}): Model {
	return {
		metadata: { name: "m" },
		spec: { pointer: "", snapshots: null, ...spec },
	};
}

describe("deprecationNote", () => {
	it("is null for a live model", () => {
		expect(deprecationNote(model())).toBeNull();
	});
	it("prefers the sunset date over the deprecation date", () => {
		expect(
			deprecationNote(
				model({
					deprecationDate: "2026-01-01",
					deprecation: {
						status: "deprecated",
						sunsetDate: "2026-06-01",
						replacement: "m-2",
					},
				}),
			),
		).toBe("Deprecated, sunsets on 2026-06-01.");
		expect(deprecationNote(model({ deprecationDate: "2026-01-01" }))).toBe(
			"Deprecated since 2026-01-01.",
		);
	});
});

describe("activeCapabilities", () => {
	it("keeps only the flags set to true", () => {
		expect(
			activeCapabilities({ chat: true, vision: false, tools: true }),
		).toEqual(["chat", "tools"]);
		expect(activeCapabilities(undefined)).toEqual([]);
	});
});

describe("familyLabel", () => {
	it("joins the version when present", () => {
		expect(familyLabel(model({ family: "claude", version: "4.5" }))).toBe(
			"claude 4.5",
		);
		expect(familyLabel(model({ family: "claude" }))).toBe("claude");
		expect(familyLabel(model({ version: "4.5" }))).toBeUndefined();
	});
});

describe("sortSnapshots", () => {
	it("lists newest first and undated last by name", () => {
		const sorted = sortSnapshots([
			{ name: "b" },
			{ name: "old", releasedAt: "2025-01-01" },
			{ name: "a" },
			{ name: "new", releasedAt: "2026-01-01" },
		]);
		expect(sorted.map((s) => s.name)).toEqual(["new", "old", "a", "b"]);
	});
});

describe("specFields", () => {
	it("keeps the filled-in facts in reading order", () => {
		const fields = specFields(
			model({
				contextWindowTotal: 200_000,
				maxOutputTokens: 64_000,
				modalities: { input: ["text", "image"], output: [] },
				license: " ",
				releaseDate: "2026-09-10",
				pointer: "m-20260910",
			}),
		);
		expect(fields).toEqual([
			{ label: "Context", value: "200k tokens" },
			{ label: "Max output", value: "64k tokens" },
			{ label: "Accepts", value: "text, image" },
			{ label: "Released", value: "2026-09-10" },
			{ label: "Points to", value: "m-20260910" },
		]);
	});
	it("names the product line, else the family", () => {
		const spec = { family: "claude", version: "4.5", pointer: "m" };
		expect(specFields(model(spec))).toEqual([
			{ label: "Family", value: "claude 4.5" },
		]);
		expect(specFields(model({ ...spec, productLine: "opus" }))).toEqual([
			{ label: "Line", value: "opus" },
		]);
	});
	it("leaves out a pointer to the model itself", () => {
		expect(specFields(model({ pointer: "m" }))).toEqual([]);
	});
});

describe("listedSnapshots", () => {
	it("skips a lone snapshot the model already points to", () => {
		const one = [{ name: "m-1" }];
		expect(listedSnapshots(model({ pointer: "m-1", snapshots: one }))).toEqual(
			[],
		);
		expect(listedSnapshots(model({ pointer: "m", snapshots: one }))).toEqual(
			one,
		);
		const two = [{ name: "m-1" }, { name: "m-2" }];
		expect(listedSnapshots(model({ pointer: "m-1", snapshots: two }))).toEqual(
			two,
		);
	});
});
