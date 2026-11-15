import { beforeEach, describe, expect, test } from "bun:test";
import { toast, useToastStore } from "./toast";

beforeEach(() => useToastStore.setState({ toasts: [] }));

const toasts = () => useToastStore.getState().toasts;

describe("toast", () => {
	test("a toast with the same key updates in place; the count tracks exact repeats", () => {
		toast("success", "Opus enabled", undefined, "model:opus");
		toast("success", "Opus disabled", undefined, "model:opus");
		expect(toasts()).toHaveLength(1);
		expect(toasts()[0]).toMatchObject({
			message: "Opus disabled",
			count: 1,
			version: 1,
		});
		toast("success", "Opus disabled", undefined, "model:opus");
		expect(toasts()[0]).toMatchObject({ count: 2, version: 2 });
	});

	test("the same line repeated folds in; other lines and keys stack", () => {
		toast("success", "Saved");
		toast("success", "Saved");
		toast("success", "Deleted");
		toast("success", "Opus enabled", undefined, "model:opus");
		toast("success", "Fable enabled", undefined, "model:fable");
		expect(toasts().map((t) => [t.message, t.count])).toEqual([
			["Saved", 2],
			["Deleted", 1],
			["Opus enabled", 1],
			["Fable enabled", 1],
		]);
	});

	test("a toast with an action never merges", () => {
		const undo = { label: "Undo", onClick: () => {} };
		toast("success", "Removed", undo);
		toast("success", "Removed", undo);
		expect(toasts()).toHaveLength(2);
	});
});
