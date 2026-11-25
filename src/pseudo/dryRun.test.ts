import { describe, expect, it } from "bun:test";
import {
	dryRunWarnings,
	HIDDEN_ROW_WARNING,
	plannedGroups,
	rowKindLabel,
	warnedFields,
	warningMessages,
} from "@/pseudo/dryRun";

const row = (kind: string) => ({ kind, id: `${kind}-1`, name: kind });

describe("plannedGroups", () => {
	it("keeps the non-empty lists in made, changed, deleted order", () => {
		expect(
			plannedGroups({
				deleted: [row("pool")],
				created: [row("policy")],
				updated: [],
			}),
		).toEqual([
			{ heading: "Makes", rows: [row("policy")] },
			{ heading: "Deletes", rows: [row("pool")] },
		]);
	});

	it("has no group for an answer that writes nothing", () => {
		expect(plannedGroups({ created: null })).toEqual([]);
	});
});

describe("rowKindLabel", () => {
	it("reads each kind a one-request write touches in sentence case", () => {
		expect(
			[
				"service-account",
				"user",
				"project",
				"team",
				"account",
				"share",
				"pool",
				"policy",
				"policy-binding",
				"key",
				"host-key",
				"budget",
				"rate-limit",
			].map(rowKindLabel),
		).toEqual([
			"Service account",
			"User",
			"Project",
			"Team",
			"Account",
			"Share",
			"Pool",
			"Policy",
			"Policy binding",
			"Key",
			"Host key",
			"Budget",
			"Rate limit",
		]);
	});

	it("keeps a kind it doesn't know as relay sent it", () => {
		expect(rowKindLabel("role-binding")).toBe("role-binding");
	});
});

describe("dryRunWarnings", () => {
	it("names each warning's field and words a hidden row's warning", () => {
		expect(
			dryRunWarnings(
				{
					warnings: [
						{
							code: "model_ref_blocked",
							kind: "policy",
							message: "A policy above excludes gpt-4o.",
							pointer: "/spec/access/models",
						},
						{ code: "model_ref_blocked", kind: "policy", message: "" },
					],
				},
				{ "/spec/access": "access" },
			),
		).toEqual([
			{ field: "access", message: "A policy above excludes gpt-4o." },
			{ message: HIDDEN_ROW_WARNING },
		]);
	});

	it("reads no warnings from a null list", () => {
		expect(dryRunWarnings({ warnings: null }, {})).toEqual([]);
	});
});

describe("warningMessages", () => {
	it("lists each message once, in order", () => {
		expect(
			warningMessages([
				{ field: "a", message: "one" },
				{ message: "two" },
				{ field: "b", message: "one" },
			]),
		).toEqual(["one", "two"]);
	});
});

describe("warnedFields", () => {
	const warnings = [
		{ field: "access", message: "first" },
		{ field: "access", message: "second" },
		{ field: "keyName", message: "key" },
		{ message: "no field" },
	] as const;

	it("marks each warned field with its first message", () => {
		expect(warnedFields(warnings, () => true)).toEqual({
			access: "first",
			keyName: "key",
		});
	});

	it("leaves a field changed since the dry run unmarked", () => {
		expect(warnedFields(warnings, (field) => field !== "access")).toEqual({
			keyName: "key",
		});
	});
});
