import { useState } from "react";
import { checkRefAgainstCatalog } from "@/models/checkRefAgainstCatalog";
import type { PickerIndex } from "@/models/usePickerCatalog";

export interface RawLineError {
	idx: number;
	raw: string;
	trimmed: string;
	error: string;
}

/**
 * One-ref-per-line draft for the raw editor. Every edit emits the valid,
 * de-duplicated refs; invalid lines stay in the draft with their error.
 */
export function usePickerRawDraft(
	value: string[],
	onChange: (next: string[]) => void,
	index: PickerIndex,
) {
	const [draft, setDraft] = useState(() => value.join("\n"));

	const errors: RawLineError[] = [];
	draft.split("\n").forEach((raw, idx) => {
		const trimmed = raw.trim();
		if (!trimmed) return;
		const error = checkRefAgainstCatalog(trimmed, index);
		if (error) errors.push({ idx, raw, trimmed, error });
	});

	function edit(nextDraft: string) {
		setDraft(nextDraft);
		const validRefs: string[] = [];
		for (const line of nextDraft.split("\n")) {
			const t = line.trim();
			if (!t) continue;
			if (checkRefAgainstCatalog(t, index)) continue;
			if (validRefs.includes(t)) continue;
			validRefs.push(t);
		}
		onChange(validRefs);
	}

	return { draft, errors, edit };
}
