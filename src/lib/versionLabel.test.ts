import { expect, test } from "bun:test";
import { versionLabel } from "./versionLabel";

test("spells out an untagged build and keeps release tags", () => {
	expect(versionLabel("dev")).toBe("development build");
	expect(versionLabel("v0.20.3")).toBe("v0.20.3");
	expect(versionLabel(undefined)).toBe("unknown");
});
