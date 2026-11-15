import type { UseMutationResult } from "@tanstack/react-query";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { toast } from "@/shared/Toast";

/** Saves a setting at once with one toast per setting as it flips; a click
 * during a save waits for it. */
export function useSettingSave<T>(
	update: UseMutationResult<unknown, Error, T>,
	failure: string,
) {
	const toastSaveError = useSaveErrorToast();
	function save(value: T, done: string, key: string) {
		if (update.isPending) return;
		update.mutate(value, {
			onSuccess: () => toast("success", done, undefined, `setting:${key}`),
			onError: (err) => toastSaveError(err, failure),
		});
	}
	return { save, pending: update.isPending };
}
