import { describe, expect, test } from "bun:test";
import {
	initialVersionPin,
	nextVersionPin,
	type VersionPin,
} from "@/hooks/useLoadedResourceVersion";

const opened: VersionPin = initialVersionPin("true:hk-1", "v1");

describe("nextVersionPin", () => {
	test("a background refetch keeps the version the form opened with", () => {
		expect(nextVersionPin(opened, "true:hk-1", "v2")).toBe(opened);
	});

	test("a reload waits for the refetched row, then re-pins and resets", () => {
		const reloading = { ...opened, reloading: true };
		expect(nextVersionPin(reloading, "true:hk-1", "v1")).toBe(reloading);

		const next = nextVersionPin(reloading, "true:hk-1", "v2");
		expect(next.version).toBe("v2");
		expect(next.reloading).toBe(false);
		expect(next.generation).toBe(opened.generation + 1);
	});

	test("opening another row pins that row's version", () => {
		const next = nextVersionPin(opened, "true:hk-2", "v7");
		expect(next.scope).toBe("true:hk-2");
		expect(next.version).toBe("v7");
	});
});
