import { describe, expect, test } from "bun:test";
import {
	type SubjectDirectory,
	subjectDisplay,
	subjectFilterOptions,
} from "@/role-bindings/subjectDirectory";

const dir: SubjectDirectory = {
	users: [{ id: "u1", name: "alice", label: "alice" }],
	groups: [{ id: "g1", name: "eng", label: "Engineering" }],
	serviceAccounts: [{ id: "s1", name: "ci-bot", label: "CI bot" }],
};

describe("subjectFilterOptions", () => {
	test("users by id, groups by name, service accounts by id", () => {
		expect(subjectFilterOptions(dir).map((o) => o.value)).toEqual([
			"user:u1",
			"group:eng",
			"serviceaccount:s1",
		]);
	});
});

describe("subjectDisplay", () => {
	test("names a known subject", () => {
		expect(subjectDisplay({ kind: "user", id: "u1" }, dir)).toEqual({
			kind: "User",
			label: "alice",
			known: true,
		});
		expect(subjectDisplay({ kind: "group", name: "eng" }, dir).label).toBe(
			"Engineering",
		);
	});
	test("keeps the raw reference for one it can't look up", () => {
		expect(subjectDisplay({ kind: "user", id: "u9" }, dir)).toEqual({
			kind: "User",
			label: "u9",
			known: false,
		});
	});
});
