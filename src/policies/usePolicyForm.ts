import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreatePolicy, useUpdatePolicy } from "@/api/hooks/policies";
import type { Policy, PolicyCreate, PolicyUpdate } from "@/api/types/policy";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useOwnerOptions } from "@/hooks/useOwnerOptions";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { ALL_OWNER_SCOPES, PERSONAL_OWNER } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	type PolicySpecValues,
	specFromFormValues,
	specToFormValues,
} from "@/policies/policyFormSpec";
import { toast } from "@/shared/Toast";

/**
 * Build a Policy snapshot from the current form values + the base policy
 * being edited (or undefined for a new policy). Used to feed analyzers a
 * draft view so diagnostics update live as the user edits, instead of
 * reflecting the last saved state.
 */
export function policyFromFormValues(
	base: Policy | undefined,
	values: PolicyFormValues,
): Policy {
	return {
		metadata: base?.metadata ?? { name: "" },
		spec: { ...base?.spec, ...specFromFormValues(values) },
	};
}

export interface PolicyFormValues extends PolicySpecValues {
	displayName: string;
	description: string;
	owner: string;
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	owner: z.string().min(1, "Pick who owns this policy."),
	poolIds: z.array(z.string()),
	models: z.array(z.string()),
	rateLimits: z.array(
		z.object({
			rateLimitId: z.string().min(1, "Pick a rate limit"),
			models: z.array(z.string()),
		}),
	),
	budgetIds: z.array(z.string()),
	enabled: z.boolean(),
	includeDeprecated: z.boolean(),
	payloadLoggingEnabled: z.boolean(),
});

function emptyValues(owner: string): PolicyFormValues {
	return {
		displayName: "",
		description: "",
		owner,
		...specToFormValues({}),
	};
}

function policyToValues(policy: Policy, owner: string): PolicyFormValues {
	return {
		displayName: displayLabel(policy.metadata),
		description: policy.metadata.description ?? "",
		owner,
		...specToFormValues(policy.spec),
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
	const loaded = useLoadedResourceVersion(
		`${open}:${policy?.metadata.id ?? ""}`,
		policy?.metadata.resourceVersion,
	);

	const ownerPicker = useOwnerOptions({
		kinds: ALL_OWNER_SCOPES,
		owner: policy?.metadata.owner,
		preset: PERSONAL_OWNER,
	});
	const { initialOwner } = ownerPicker;

	const initial = useMemo<PolicyFormValues>(
		() =>
			policy ? policyToValues(policy, initialOwner) : emptyValues(initialOwner),
		[policy, initialOwner],
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

	function runValidation({ value }: { value: PolicyFormValues }) {
		const r = schema.safeParse(value);
		if (r.success) return undefined;
		const fields: Record<string, string> = {};
		for (const issue of r.error.issues) {
			const key = issue.path.join(".");
			if (key && !fields[key]) fields[key] = issue.message;
		}
		return { fields };
	}

	const form = useForm({
		defaultValues: initial,
		validators: {
			onSubmit: runValidation,
			onChange: runValidation,
		},
		onSubmit: async ({ value }) => {
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
							owner: ownerPicker.toOwner(value.owner),
							...(description
								? { description }
								: policy.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec: { ...policy.spec, ...spec },
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
							owner: ownerPicker.toOwner(value.owner),
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
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		form.reset(open ? initial : emptyValues(initialOwner));
	}, [resetKey, open, initial, initialOwner, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (policy?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.displayName?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const descriptionError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.description?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const ownerError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.owner?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		ownerOptions: ownerPicker.options,
		ownerError,
	};
}
