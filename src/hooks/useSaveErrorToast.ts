import { useQueryClient } from "@tanstack/react-query";
import { ApiError, isStaleResourceVersion } from "@/api/types/errors";
import { toast } from "@/stores/toast";

export const STALE_SAVE_MESSAGE =
	"This changed since you opened it. Reload to see the latest version, then apply your change again.";

/**
 * Toasts a failed save. A stale-version conflict gets a Reload action instead
 * of the raw error; the change is never retried on the user's behalf.
 */
export function toastSaveError(
	err: unknown,
	fallback: string,
	reload: () => void,
): void {
	if (isStaleResourceVersion(err)) {
		toast("error", STALE_SAVE_MESSAGE, { label: "Reload", onClick: reload });
		return;
	}
	toast("error", err instanceof ApiError ? err.body.message : fallback);
}

/** Refetches every active query — what "Reload" means for views that render straight from the cache. */
export function useReloadQueries(): () => void {
	const queryClient = useQueryClient();
	return () => void queryClient.invalidateQueries();
}

/**
 * {@link toastSaveError} whose default Reload is {@link useReloadQueries} —
 * enough for list rows and toggles. Edit forms pass their own reload so the
 * draft resets to the fresh row.
 */
export function useSaveErrorToast() {
	const reloadQueries = useReloadQueries();
	return (err: unknown, fallback: string, reload?: () => void): void =>
		toastSaveError(err, fallback, reload ?? reloadQueries);
}
