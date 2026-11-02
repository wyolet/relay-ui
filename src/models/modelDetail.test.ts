import { describe, expect, it } from "bun:test";
import type { Model } from "@/api/types/model";
import {
	activeCapabilities,
	deprecationNote,
	familyLabel,
	sortSnapshots,
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
		).toBe("deprecated · sunsets 2026-06-01 · successor → m-2");
		expect(deprecationNote(model({ deprecationDate: "2026-01-01" }))).toBe(
			"deprecated 2026-01-01",
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
