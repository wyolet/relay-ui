import { describe, expect, it } from "bun:test";
import { resolveMutability } from "./ownership";

const locked = { allowEdit: false, allowDelete: false };
const both = { canEdit: true, canDelete: true };
const none = { canEdit: false, canDelete: false };

describe("resolveMutability", () => {
	it("gates catalog rows by governance", () => {
		expect(
			resolveMutability({ owner: { kind: "provider" } }, locked, true),
		).toEqual(none);
		expect(
			resolveMutability(
				{ owner: { kind: "host" } },
				{ allowEdit: true, allowDelete: false },
				true,
			),
		).toEqual({ canEdit: true, canDelete: false });
	});

	it("lets only an admin change system rows", () => {
		const system = { owner: { kind: "system" as const } };
		expect(resolveMutability(system, locked, true)).toEqual(both);
		expect(resolveMutability(system, locked, false)).toEqual(none);
	});

	it("always lets tenant-owned and unowned rows change", () => {
		for (const kind of ["team", "project", "user"] as const) {
			expect(resolveMutability({ owner: { kind } }, locked, false)).toEqual(
				both,
			);
		}
		expect(resolveMutability({}, locked, false)).toEqual(both);
	});

	it("governs detached catalog rows as user-owned", () => {
		const catalogDetachedAt = "2026-10-18T12:00:00Z";
		for (const kind of ["provider", "host", "system"] as const) {
			expect(
				resolveMutability(
					{ owner: { kind }, catalogDetachedAt },
					locked,
					false,
				),
			).toEqual(both);
		}
	});
});
