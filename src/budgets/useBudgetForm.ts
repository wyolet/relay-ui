import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import {
	type Budget,
	useCreateBudget,
	useUpdateBudget,
} from "@/api/hooks/budgets";
import {
	AMOUNT_USD_PATTERN,
	amountInput,
	BUDGET_MODES,
	BUDGET_PERIODS,
	type BudgetMode,
	type BudgetPeriod,
	DEFAULT_MODE,
	DEFAULT_PERIOD,
} from "@/budgets/budgetFormat";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useFormOwner } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import { toast } from "@/shared/Toast";

export interface BudgetFormValues {
	displayName: string;
	description: string;
	amountUsd: string;
	period: BudgetPeriod;
	mode: BudgetMode;
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	amountUsd: z
		.string()
		.min(1, "Enter the cap in USD.")
		.regex(
			AMOUNT_USD_PATTERN,
			"Whole dollars or up to two decimals, such as 2000 or 49.50.",
		),
	period: z.enum(BUDGET_PERIODS),
	mode: z.enum(BUDGET_MODES),
});

function emptyValues(): BudgetFormValues {
	return {
		displayName: "",
		description: "",
		amountUsd: "",
		period: DEFAULT_PERIOD,
		mode: DEFAULT_MODE,
	};
}

function toValues(budget: Budget): BudgetFormValues {
	return {
		displayName: displayLabel(budget.metadata),
		description: budget.metadata.description ?? "",
		amountUsd: budget.spec.amountUsd,
		period: budget.spec.period ?? DEFAULT_PERIOD,
		mode: budget.spec.mode ?? DEFAULT_MODE,
	};
}

interface UseBudgetFormOptions {
	budget?: Budget;
	onSaved: (savedName: string) => void;
}

export function useBudgetForm({ budget, onSaved }: UseBudgetFormOptions) {
	const isEdit = budget !== undefined;
	const createBudget = useCreateBudget();
	const updateBudget = useUpdateBudget();
	const toastSaveError = useSaveErrorToast();
	const loaded = useLoadedResourceVersion(
		budget?.metadata.id ?? "",
		budget?.metadata.resourceVersion,
	);

	const { owner, placement } = useFormOwner(budget?.metadata);

	const initial = useMemo<BudgetFormValues>(
		() => (budget ? toValues(budget) : emptyValues()),
		[budget],
	);
	const suffixRef = useRef<string>(randomSuffix());
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		return `${slugify(trimmed) || "budget"}-${suffixRef.current}`;
	};

	const runValidation = zodFieldValidator<BudgetFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const spec = {
				amountUsd: value.amountUsd,
				period: value.period,
				mode: value.mode,
			};
			try {
				if (isEdit && budget) {
					const saved = await updateBudget.mutateAsync({
						id: budget.metadata.id ?? "",
						body: {
							metadata: {
								...budget.metadata,
								resourceVersion: loaded.version,
								displayName,
								description,
							},
							spec,
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Budget "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createBudget.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							...(owner ? { owner } : {}),
							...(description ? { description } : {}),
						},
						spec,
					});
					toast("success", `Budget "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toastSaveError(
					err,
					isEdit ? "Failed to update budget." : "Failed to create budget.",
					loaded.reload,
				);
			}
		},
	});

	// The draft is only replaced when the user reloads after a conflict.
	const lastResetKey = useRef(loaded.resetKey);
	useEffect(() => {
		if (lastResetKey.current === loaded.resetKey) return;
		lastResetKey.current = loaded.resetKey;
		form.reset(initial);
	}, [loaded.resetKey, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const errors = useStore(form.store, (s) => ({
		displayName: shownError(s.fieldMeta?.displayName, s.submissionAttempts),
		description: shownError(s.fieldMeta?.description, s.submissionAttempts),
		amountUsd: shownError(s.fieldMeta?.amountUsd, s.submissionAttempts),
	}));

	function setAmount(raw: string) {
		form.setFieldValue("amountUsd", amountInput(raw));
	}

	return {
		form,
		values,
		errors,
		isEdit,
		slugPreview: budget
			? budget.metadata.name
			: computeSlug(values.displayName),
		placement,
		setAmount,
	};
}
