import { describe, expect, it } from "bun:test";
import { resolveMutability } from "./ownership";

const locked = { allowEdit: false, allowDelete: false };
const both = { canEdit: true, canDelete: true };
const none = { canEdit: false, canDelete: false };

describe("resolveMutability", () => {
	it("gates catalog rows by governance", () => {
		expect(resolveMutability({ owner: { kind: "provider" } }, locked)).toEqual(
			none,
		);
		expect(
			resolveMutability(
				{ owner: { kind: "host" } },
				{ allowEdit: true, allowDelete: false },
			),
		).toEqual({ canEdit: true, canDelete: false });
	});

	it("leaves system, team, project, user and unowned rows to RBAC", () => {
		for (const kind of ["system", "team", "project", "user"] as const) {
			expect(resolveMutability({ owner: { kind } }, locked)).toEqual(both);
		}
		expect(resolveMutability({}, locked)).toEqual(both);
	});

	it("governs detached catalog rows as user-owned", () => {
		const catalogDetachedAt = "2026-10-18T12:00:00Z";
		for (const kind of ["provider", "host", "system"] as const) {
			expect(
				resolveMutability({ owner: { kind }, catalogDetachedAt }, locked),
			).toEqual(both);
		}
	});
});
