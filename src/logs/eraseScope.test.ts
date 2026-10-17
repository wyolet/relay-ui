import { describe, expect, test } from "bun:test";
import {
	describeEraseScope,
	type EraseTarget,
	eraseConfirmName,
	toEraseBody,
} from "./eraseScope";

const project: EraseTarget = {
	id: "p-1",
	name: "acme",
	label: "Acme",
	kind: "project",
};
const user: EraseTarget = {
	id: "u-1",
	name: "alice",
	label: "alice",
	kind: "user",
};

describe("erase scope", () => {
	test("nothing picked: nothing to confirm or send", () => {
		expect(eraseConfirmName({})).toBeUndefined();
		expect(describeEraseScope({})).toBeUndefined();
		expect(toEraseBody({})).toEqual({});
	});

	test("a project alone", () => {
		expect(eraseConfirmName({ project })).toBe("acme");
		expect(describeEraseScope({ project })).toBe("project Acme");
		expect(toEraseBody({ project })).toEqual({ projectId: "p-1" });
	});

	test("a principal alone", () => {
		expect(eraseConfirmName({ principal: user })).toBe("alice");
		expect(describeEraseScope({ principal: user })).toBe("user alice");
		expect(toEraseBody({ principal: user })).toEqual({ principalId: "u-1" });
	});

	test("both narrows to the principal within the project", () => {
		const sel = { project, principal: user };
		expect(eraseConfirmName(sel)).toBe("alice");
		expect(describeEraseScope(sel)).toBe("user alice in project Acme");
		expect(toEraseBody(sel)).toEqual({ projectId: "p-1", principalId: "u-1" });
	});
});
