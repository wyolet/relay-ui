import { describe, expect, it } from "bun:test";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { components } from "@/api/types.gen";
import {
	describeDuplicate,
	fromSubjectRows,
	newSubjectRow,
	principalBinding,
	toOfferedKind,
} from "./subjects";

type Owner = components["schemas"]["Owner"];

function binding(
	name: string,
	owner: Owner,
	subjects: PolicyBinding["spec"]["subjects"],
): PolicyBinding {
	return {
		metadata: { id: name, name, owner },
		spec: { policyId: `policy-${name}`, subjects },
	};
}

describe("principalBinding", () => {
	const projectOwned = binding("proj", { kind: "project", id: "p1" }, [
		{ kind: "serviceaccount", id: "sa1" },
		{ kind: "user", id: "u1" },
	]);
	const systemOwned = binding("sys", { kind: "system" }, [
		{ kind: "user", id: "u2" },
	]);
	const personal = binding("own", { kind: "user", id: "u3" }, [
		{ kind: "user", id: "u3" },
	]);
	const all = [projectOwned, systemOwned, personal];

	it("finds a service account's binding under any owner", () => {
		expect(principalBinding(all, { kind: "serviceaccount", id: "sa1" })).toBe(
			projectOwned,
		);
	});

	it("ignores team and project bindings for a user's keys", () => {
		expect(principalBinding(all, { kind: "user", id: "u1" })).toBeUndefined();
	});

	it("takes a system-owned or the user's own binding", () => {
		expect(principalBinding(all, { kind: "user", id: "u2" })).toBe(systemOwned);
		expect(principalBinding(all, { kind: "user", id: "u3" })).toBe(personal);
	});

	it("matches kind and id together", () => {
		expect(
			principalBinding(all, { kind: "serviceaccount", id: "u2" }),
		).toBeUndefined();
	});
});

describe("describeDuplicate", () => {
	const message =
		'serviceaccount:sa1 is already bound by policy binding "ci"; a subject is bound to one policy';

	it("names the refused subject", () => {
		expect(
			describeDuplicate(message, (key) =>
				key === "serviceaccount:sa1" ? 'Service account "ci-bot"' : undefined,
			),
		).toEqual({
			subjectKey: "serviceaccount:sa1",
			message:
				'Service account "ci-bot" is already bound by policy binding "ci"; a subject is bound to one policy',
		});
	});

	it("keeps the raw key when the subject is unknown", () => {
		expect(describeDuplicate(message, () => undefined)).toEqual({
			subjectKey: "serviceaccount:sa1",
			message,
		});
	});

	it("passes other messages through", () => {
		expect(describeDuplicate("subject already bound", () => "x")).toEqual({
			subjectKey: undefined,
			message: "subject already bound",
		});
	});
});

describe("subject rows", () => {
	it("drops blank rows and trims ids", () => {
		expect(
			fromSubjectRows([
				newSubjectRow("team", " t1 "),
				newSubjectRow("account", ""),
				newSubjectRow("host", "h1"),
			]),
		).toEqual([
			{ kind: "team", id: "t1" },
			{ kind: "host", id: "h1" },
		]);
	});

	it("offers no host or credential kind", () => {
		expect(toOfferedKind("account")).toBe("account");
		expect(toOfferedKind("host")).toBeUndefined();
		expect(toOfferedKind("credential")).toBeUndefined();
		expect(toOfferedKind(null)).toBeUndefined();
	});
});
