import { describe, expect, it } from "bun:test";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import {
	ownedServiceAccountChoices,
	serviceAccountOwnerChoices,
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

describe("serviceAccountOwnerChoices", () => {
	it("lists the projects, then each team or user owning a service account once", () => {
		expect(
			serviceAccountOwnerChoices(
				[{ value: "p1", label: "Search" }],
				all,
				(scope) => `${scope.kind} ${scope.id}`,
			),
		).toEqual([
			{ value: "p1", label: "Search" },
			{ value: "t1", label: "team t1" },
			{ value: "u1", label: "personal u1" },
		]);
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
