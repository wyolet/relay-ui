import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { usableBudgetsQuery, useUsableBudgets } from "@/api/hooks/budgets";
import { useCreatePolicy, useUpdatePolicy } from "@/api/hooks/policies";
import { usablePoolsQuery, useUsablePools } from "@/api/hooks/pools";
import {
	usableRateLimitsQuery,
	useUsableRateLimits,
} from "@/api/hooks/ratelimits";
import type { Policy, PolicyCreate, PolicyUpdate } from "@/api/types/policy";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useScopePrefetch } from "@/hooks/useScopePrefetch";
import { useFormOwner } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	unavailablePicks,
	unavailablePicksError,
	updatingScope,
} from "@/lib/workContext";
import {
	budgetLinksForIds,
	type PolicySpecValues,
	specFromFormValues,
	specToFormValues,
} from "@/policies/policyFormSpec";
import {
	poolIdsOnReachSwitch,
	type ReachChoice,
	reachChoiceFor,
} from "@/policies/policyReach";
import { toast } from "@/shared/Toast";

export interface PolicyFormValues extends PolicySpecValues {
	displayName: string;
	description: string;
	/** Unset on create until the operator picks one. */
	reach?: ReachChoice;
}

const schema = z.object({
	reach: z.enum(["scope", "pools"], {
		error: "Choose how this policy reaches credentials.",
	}),
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	poolIds: z.array(z.string()),
	models: z.array(z.string()),
	rateLimits: z.array(
		z.object({
			rateLimitId: z.string().min(1, "Pick a rate limit"),
			models: z.array(z.string()),
			shared: z.boolean(),
		}),
	),
	budgets: z.array(z.object({ budgetId: z.string(), shared: z.boolean() })),
	enabled: z.boolean(),
});

const POOLS_MISSING = "Add a pool, or choose Every credential in scope.";

// Linking no pools reaches the scope, so "Only these pools" needs one.
function poolsMissing(values: PolicyFormValues): boolean {
	return values.reach === "pools" && values.poolIds.length === 0;
}

function emptyValues(): PolicyFormValues {
	return {
		displayName: "",
		description: "",
		...specToFormValues({}),
	};
}

function policyToValues(policy: Policy): PolicyFormValues {
	return {
		displayName: displayLabel(policy.metadata),
		description: policy.metadata.description ?? "",
		...specToFormValues(policy.spec),
		reach: reachChoiceFor(policy.spec.poolIds),
	};
}

interface UsePolicyFormOptions {
	open: boolean;
	policy?: Policy;
	onSaved: () => void;
}

export function usePolicyForm({ open, policy, onSaved }: UsePolicyFormOptions) {
	const isEdit = policy !== undefined;
	const createPolicy = useCreatePolicy();
	const updatePolicy = useUpdatePolicy();
	const toastSaveError = useSaveErrorToast();
	const queryClient = useQueryClient();
	const loaded = useLoadedResourceVersion(
		`${open}:${policy?.metadata.id ?? ""}`,
		policy?.metadata.resourceVersion,
	);

	const { owner, usableBy, placement } = useFormOwner(policy?.metadata);

	const initial = useMemo<PolicyFormValues>(
		() => (policy ? policyToValues(policy) : emptyValues()),
		[policy],
	);
	const suffixRef = useRef<string>(
		policy?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "policy";
		return `${base}-${suffixRef.current}`;
	};

	const runValidation = zodFieldValidator<PolicyFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: {
			onSubmit: runValidation,
			onChange: runValidation,
		},
		onSubmit: async ({ value }) => {
			// Flagged picks block the save; their field errors say what to do.
			if (
				unavailablePools ||
				unavailableBudgets ||
				unavailableRateLimits ||
				poolsMissing(value)
			) {
				return;
			}
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const spec = specFromFormValues(value);
			try {
				if (isEdit && policy) {
					const payload: PolicyUpdate = {
						metadata: {
							...policy.metadata,
							resourceVersion: loaded.version,
							displayName,
							...(description
								? { description }
								: policy.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec,
					};
					const saved = await updatePolicy.mutateAsync({
						id: policy.metadata.id ?? "",
						body: payload,
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Policy "${displayName}" updated.`);
				} else {
					const name = computeSlug(displayName);
					const payload: PolicyCreate = {
						metadata: {
							name,
							displayName,
							...(owner ? { owner } : {}),
							...(description ? { description } : {}),
						},
						spec,
					};
					await createPolicy.mutateAsync(payload);
					toast("success", `Policy "${displayName}" created.`);
				}
				onSaved();
			} catch (err) {
				toastSaveError(
					err,
					isEdit ? "Failed to update policy." : "Failed to create policy.",
					loaded.reload,
				);
			}
		},
	});

	// Reset only when the form opens/closes, the edited resource changes, or the
	// user reloads it — not on every `initial` identity change, so a background
	// refetch can't wipe an open draft.
	const resetKey = loaded.resetKey;
	const lastResetKey = useRef<string | null>(null);
	// Pools the scope reach set aside, restored if the operator switches back.
	const setAsidePoolIds = useRef<string[]>([]);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		setAsidePoolIds.current = [];
		form.reset(open ? initial : emptyValues());
	}, [resetKey, open, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (policy?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.displayName, s.submissionAttempts),
	);
	const descriptionError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.description, s.submissionAttempts),
	);
	const reachError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.reach, s.submissionAttempts),
	);

	const poolsList = useUsablePools(usableBy);
	const budgetsList = useUsableBudgets(usableBy);
	const rateLimitsList = useUsableRateLimits(usableBy);
	const unavailablePools = unavailablePicks(
		values.poolIds,
		poolsList,
		placement,
	);
	const unavailableBudgets = unavailablePicks(
		values.budgets.map((b) => b.budgetId),
		budgetsList,
		placement,
	);
	const unavailableRateLimits = unavailablePicks(
		values.rateLimits.flatMap((l) => (l.rateLimitId ? [l.rateLimitId] : [])),
		rateLimitsList,
		placement,
	);
	const submitTried = useStore(form.store, (s) => s.submissionAttempts > 0);

	const prefetchLinks = useCallback(
		(scope: string) => {
			void queryClient.prefetchQuery(usablePoolsQuery(scope));
			void queryClient.prefetchQuery(usableBudgetsQuery(scope));
			void queryClient.prefetchQuery(usableRateLimitsQuery(scope));
		},
		[queryClient],
	);
	useScopePrefetch(placement?.editable ? prefetchLinks : undefined);

	function setReach(next: ReachChoice) {
		const switched = poolIdsOnReachSwitch(
			next,
			values.poolIds,
			setAsidePoolIds.current,
		);
		setAsidePoolIds.current = switched.setAside;
		form.setFieldValue("poolIds", switched.poolIds);
		form.setFieldValue("reach", next);
	}
	function setBudgetIds(ids: string[]) {
		form.setFieldValue("budgets", budgetLinksForIds(ids, values.budgets));
	}
	function setBudgetShared(budgetId: string, shared: boolean) {
		form.setFieldValue(
			"budgets",
			values.budgets.map((b) =>
				b.budgetId === budgetId ? { ...b, shared } : b,
			),
		);
	}

	return {
		form,
		values,
		setReach,
		setBudgetIds,
		setBudgetShared,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		reachError,
		poolsError:
			unavailablePicksError(unavailablePools, submitTried) ??
			(submitTried && poolsMissing(values) ? POOLS_MISSING : undefined),
		placement,
		usableBy,
		updatingFor: {
			pools: updatingScope(placement, poolsList),
			budgets: updatingScope(placement, budgetsList),
			rateLimits: updatingScope(placement, rateLimitsList),
		},
		unavailable: {
			pools: unavailablePools,
			budgets: unavailableBudgets,
			rateLimits: unavailableRateLimits,
		},
		unavailableErrors: {
			budgets: unavailablePicksError(unavailableBudgets, submitTried),
			rateLimits: unavailablePicksError(unavailableRateLimits, submitTried),
		},
	};
}
