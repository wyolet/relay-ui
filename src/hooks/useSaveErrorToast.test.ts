import { afterEach, describe, expect, test } from "bun:test";
import { ApiError, isStaleResourceVersion } from "@/api/types/errors";
import { STALE_SAVE_MESSAGE, toastSaveError } from "@/hooks/useSaveErrorToast";
import { useToastStore } from "@/stores/toast";

const stale = new ApiError(409, {
	type: "invalid_request_error",
	code: "stale_resource_version",
	message:
		'host-key "hk-1" changed since you opened it; reload it and apply your change again',
});

afterEach(() => {
	useToastStore.setState({ toasts: [] });
});

describe("isStaleResourceVersion", () => {
	test("matches the relay's stale-version conflict", () => {
		expect(isStaleResourceVersion(stale)).toBe(true);
	});

	test("ignores other conflicts and errors", () => {
		const conflict = new ApiError(409, {
			type: "invalid_request_error",
			code: "conflict",
			message: "name taken",
		});
		expect(isStaleResourceVersion(conflict)).toBe(false);
		expect(isStaleResourceVersion(new Error("409"))).toBe(false);
	});
});

describe("toastSaveError", () => {
	test("a stale save offers Reload and never retries on its own", () => {
		let reloads = 0;
		toastSaveError(stale, "Failed to update credential.", () => {
			reloads++;
		});

		const [t] = useToastStore.getState().toasts;
		expect(t?.kind).toBe("error");
		expect(t?.message).toBe(STALE_SAVE_MESSAGE);
		expect(t?.action?.label).toBe("Reload");
		expect(reloads).toBe(0);

		t?.action?.onClick();
		expect(reloads).toBe(1);
	});

	test("other API errors show the relay's message without an action", () => {
		const err = new ApiError(400, {
			type: "invalid_request_error",
			message: "spec.hostId: unknown host",
		});
		toastSaveError(err, "Failed to update credential.", () => {});

		const [t] = useToastStore.getState().toasts;
		expect(t?.message).toBe("spec.hostId: unknown host");
		expect(t?.action).toBeUndefined();
	});

	test("non-API errors fall back to the caller's message", () => {
		toastSaveError(new Error("boom"), "Failed to update credential.", () => {});
		expect(useToastStore.getState().toasts[0]?.message).toBe(
			"Failed to update credential.",
		);
	});
});
