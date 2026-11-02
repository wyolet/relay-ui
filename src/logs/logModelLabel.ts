import type { LogLabeler } from "./useLogsFilterOptions";

/**
 * The model a log row names: the catalog's name, else the raw id, else what
 * the client asked for. A request refused before its body was read has none.
 */
export function logModelLabel(
	log: { model_id?: string | null; requested_model?: string | null },
	labelFor: LogLabeler | undefined,
): string {
	return (
		labelFor?.("model", log.model_id ?? undefined) ??
		log.model_id ??
		log.requested_model ??
		"—"
	);
}
