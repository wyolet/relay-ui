import { describe, expect, it } from "bun:test";
import { ApiError } from "@/api/types/errors";
import type { PolicyBinding } from "@/api/types/policyBinding";
import {
	type AttachEntity,
	attachErrorMessage,
	attachOwner,
	attachWriteOwners,
	detachDescription,
	sharedBindingNote,
} from "./attachPolicy";

const entity: AttachEntity = {
	label: "Web",
	owner: { kind: "project", id: "p1" },
};

function binding(
	accountIds: string[],
	extra: Partial<PolicyBinding["spec"]> = {},
): PolicyBinding {
	return {
		metadata: {
			id: "b1",
			name: "shared",
			resourceVersion: "7",
			owner: { kind: "team", id: "t1" },
		},
		spec: { policyId: "pol-old", accountIds, ...extra },
	};
}

describe("owners", () => {
	const team = { kind: "team", id: "t1" } as const;

	it("lands every attach in the entity's scope", () => {
		expect(attachOwner(entity)).toEqual(entity.owner);
	});

	it("writes in the binding it leaves and the entity's scope", () => {
		expect(attachWriteOwners(entity, undefined)).toEqual([entity.owner]);
		expect(attachWriteOwners(entity, binding(["a1"]))).toEqual([
			team,
			entity.owner,
		]);
	});
});

describe("attachErrorMessage", () => {
	const name = (id: string) =>
		id === "a1" ? 'Project account "Web"' : undefined;
	const type = "invalid_request_error";

	it("names the account another binding holds", () => {
		const err = new ApiError(409, {
			type,
			code: "duplicate_binding",
			message: 'account a1 is already bound by policy binding "ci"',
		});
		expect(attachErrorMessage(err, name)).toBe(
			'Project account "Web" is already bound by policy binding "ci"',
		);
	});

	it("passes scope refusals through", () => {
		const err = new ApiError(400, {
			type,
			message: "policy is not usable from project web",
		});
		expect(attachErrorMessage(err, name)).toBe(
			"policy is not usable from project web",
		);
	});

	it("leaves other failures to a toast", () => {
		const stale = new ApiError(409, {
			type,
			code: "stale_resource_version",
			message: "changed",
		});
		expect(attachErrorMessage(stale, name)).toBeUndefined();
		expect(attachErrorMessage(new Error("network"), name)).toBeUndefined();
	});
});

describe("wording", () => {
	it("notes a shared binding", () => {
		expect(sharedBindingNote(binding(["a1"]), "Shared", "a1")).toBeUndefined();
		expect(sharedBindingNote(binding(["a1", "a2"]), "Shared", "a1")).toBe(
			'Policy binding "Shared" is shared with 1 other account. Saving moves this account to a binding of its own; the others keep their policy.',
		);
	});

	it("says what detaching does", () => {
		expect(detachDescription(binding(["a1"]), "Shared", "a1")).toBe(
			'Deletes policy binding "Shared", which holds only this account. Its requests then follow only the policies above it.',
		);
		expect(detachDescription(binding(["a1", "a2", "a3"]), "Shared", "a1")).toBe(
			'Takes this account out of policy binding "Shared". The binding is shared with 2 other accounts and keeps its policy for them.',
		);
	});
});
