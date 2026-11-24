import { useState } from "react";
import type { z } from "zod";

/** Each failing field's first message, for the fields a step owns. */
export function stepFieldErrors<F extends string>(
	schema: z.ZodType,
	values: unknown,
	fieldStep: Record<F, string>,
): Partial<Record<F, string>> {
	const errors: Partial<Record<F, string>> = {};
	const parsed = schema.safeParse(values);
	if (parsed.success) return errors;
	const owned = (path: unknown): path is F =>
		typeof path === "string" && path in fieldStep;
	for (const issue of parsed.error.issues) {
		const field = issue.path[0];
		if (owned(field)) errors[field] ??= issue.message;
	}
	return errors;
}

/**
 * The open step of a multi-step form. `next` moves on only when the open
 * step's fields are valid, and calls `onFinish` from the last one; a field's
 * error shows once its step was tried.
 */
export function useFormSteps<S extends string, F extends string>({
	steps,
	fieldStep,
	fieldErrors,
	onFinish,
}: {
	steps: readonly S[];
	fieldStep: Record<F, S>;
	fieldErrors: Partial<Record<F, string>>;
	onFinish: () => void;
}) {
	const [stepIndex, setStepIndex] = useState(0);
	const [tried, setTried] = useState<readonly S[]>([]);
	const step = steps[stepIndex] ?? steps[0];

	const errors: Partial<Record<F, string>> = {};
	let stepValid = true;
	for (const field in fieldStep) {
		const message = fieldErrors[field];
		if (message === undefined) continue;
		if (tried.includes(fieldStep[field])) errors[field] = message;
		if (fieldStep[field] === step) stepValid = false;
	}

	return {
		step,
		stepIndex,
		lastStep: stepIndex === steps.length - 1,
		errors,
		next() {
			if (step === undefined) return;
			setTried((t) => (t.includes(step) ? t : [...t, step]));
			if (!stepValid) return;
			if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
			else onFinish();
		},
		back() {
			setStepIndex(Math.max(stepIndex - 1, 0));
		},
	};
}
