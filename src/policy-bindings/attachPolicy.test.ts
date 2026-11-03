import { describe, expect, it } from "bun:test";
import { ApiError } from "@/api/types/errors";
import type { PolicyBinding } from "@/api/types/policyBinding";
import {
	type AttachEntity,
	attachErrorMessage,
	attachOwner,
	attachWriteOwners,
	detachDescription,
	newBindingName,
	planAttach,
	planDetach,
	sharedBindingNote,
} from "./attachPolicy";

const entity: AttachEntity = {
	slug: "web",
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

const none = new Set<string>();

describe("planAttach", () => {
	it("creates a single-account binding when none holds the account", () => {
		expect(planAttach(entity, "a1", undefined, "pol", none)).toEqual([
			{
				op: "create",
				body: {
					metadata: {
						name: "web-policy",
						displayName: "Web policy",
						owner: { kind: "project", id: "p1" },
					},
					spec: { policyId: "pol", accountIds: ["a1"] },
				},
			},
		]);
	});

	it("swaps the policy on the account's own binding, keeping its fields and version", () => {
		const own = binding(["a1"], { enabled: false });
		expect(planAttach(entity, "a1", own, "pol", none)).toEqual([
			{
				op: "update",
				id: "b1",
				body: {
					metadata: own.metadata,
					spec: { policyId: "pol", accountIds: ["a1"], enabled: false },
				},
			},
		]);
	});

	it("splits a shared binding: frees the account, then binds it alone", () => {
		const shared = binding(["a0", "a1", "a2"]);
		const writes = planAttach(entity, "a1", shared, "pol", none);
		expect(writes.map((w) => w.op)).toEqual(["update", "create"]);
		expect(writes[0]).toEqual({
			op: "update",
			id: "b1",
			body: {
				metadata: shared.metadata,
				spec: { policyId: "pol-old", accountIds: ["a0", "a2"] },
			},
		});
		expect(writes[1]).toMatchObject({
			op: "create",
			body: {
				metadata: { owner: { kind: "project", id: "p1" } },
				spec: { policyId: "pol", accountIds: ["a1"] },
			},
		});
	});

	it("writes nothing when the account already has the policy", () => {
		expect(planAttach(entity, "a1", binding(["a1"]), "pol-old", none)).toEqual(
			[],
		);
		expect(
			planAttach(entity, "a1", binding(["a0", "a1"]), "pol-old", none),
		).toEqual([]);
	});
});

describe("planDetach", () => {
	it("deletes a binding that holds only the account", () => {
		expect(planDetach(binding(["a1"]), "a1")).toEqual([
			{ op: "delete", id: "b1" },
		]);
	});

	it("takes the account out of a shared binding", () => {
		expect(planDetach(binding(["a1", "a2"]), "a1")).toEqual([
			{
				op: "update",
				id: "b1",
				body: {
					metadata: binding([]).metadata,
					spec: { policyId: "pol-old", accountIds: ["a2"] },
				},
			},
		]);
	});
});

describe("owners", () => {
	const team = { kind: "team", id: "t1" } as const;

	it("saves into the account's own binding under its owner", () => {
		expect(attachOwner(entity, binding(["a1"]), "a1")).toEqual(team);
		expect(attachWriteOwners(entity, binding(["a1"]), "a1")).toEqual([team]);
	});

	it("lands new bindings in the entity's scope", () => {
		expect(attachOwner(entity, undefined, "a1")).toEqual(entity.owner);
		expect(attachOwner(entity, binding(["a1", "a2"]), "a1")).toEqual(
			entity.owner,
		);
		expect(attachWriteOwners(entity, binding(["a1", "a2"]), "a1")).toEqual([
			team,
			entity.owner,
		]);
	});
});

describe("newBindingName", () => {
	it("numbers past taken names", () => {
		expect(newBindingName("web", new Set(["web-policy"]))).toBe("web-policy-2");
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
