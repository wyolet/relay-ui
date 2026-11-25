import { describe, expect, it } from "bun:test";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import {
	ownedServiceAccountChoices,
	serviceAccountOwnerGroups,
} from "@/keys/serviceAccountChoices";

const sa = (
	id: string,
	kind: "project" | "team" | "user",
	ownerId: string,
): ServiceAccount => ({
	metadata: {
		id,
		name: id,
		displayName: id.toUpperCase(),
		owner: { kind, id: ownerId },
	},
	spec: kind === "project" ? { projectId: ownerId } : {},
});

const all = [
	sa("a", "project", "p1"),
	sa("b", "team", "t1"),
	sa("c", "user", "u1"),
	sa("d", "team", "t1"),
];

describe("serviceAccountOwnerGroups", () => {
	it("groups the projects, then each team or user owning a service account once", () => {
		expect(
			serviceAccountOwnerGroups(
				[{ value: "p1", label: "Search" }],
				all,
				(scope) => scope.id,
			),
		).toEqual([
			{ label: "Projects", options: [{ value: "p1", label: "Search" }] },
			{ label: "Teams", options: [{ value: "t1", label: "t1" }] },
			{ label: "Users", options: [{ value: "u1", label: "u1" }] },
		]);
	});

	it("leaves out kinds without owners", () => {
		expect(
			serviceAccountOwnerGroups([], [all[1]], (scope) => scope.id),
		).toEqual([{ label: "Teams", options: [{ value: "t1", label: "t1" }] }]);
	});
});

describe("ownedServiceAccountChoices", () => {
	it("lists the service accounts of the picked owner", () => {
		expect(ownedServiceAccountChoices(all, "t1")).toEqual([
			{ value: "b", label: "B" },
			{ value: "d", label: "D" },
		]);
		expect(ownedServiceAccountChoices(all, "u1")).toEqual([
			{ value: "c", label: "C" },
		]);
		expect(ownedServiceAccountChoices(all, "")).toEqual([]);
	});
});
