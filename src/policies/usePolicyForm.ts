import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreatePolicy, useUpdatePolicy } from "@/api/hooks/policies";
import { ApiError } from "@/api/types/errors";
import type { Policy, PolicyCreate, PolicyUpdate } from "@/api/types/policy";
import {
	DEFAULT_KEY_SELECTION,
	KEY_SELECTION_VALUES,
	type KeySelection,
} from "@/config/policy";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";
import { toast } from "@/shared/Toast";

export interface RLBindingValue {
	rateLimitId: string;
	models: string[];
}

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
	const cleanedBindings = values.rlBindings.filter((b) => b.rateLimitId);
	const single =
		cleanedBindings.length === 1 && cleanedBindings[0]?.models.length === 0
			? cleanedBindings[0]
			: null;
	return {
		metadata: base?.metadata ?? { name: "" },
		spec: {
			enabled: values.enabled,
			hostKeyIds: values.hostKeyIds.length > 0 ? values.hostKeyIds : null,
			keySelection: values.keySelection,
			models: values.models.length > 0 ? values.models : null,
			rateLimitId: single ? single.rateLimitId : undefined,
			rlBindings:
				!single && cleanedBindings.length > 0
					? cleanedBindings.map((b) => ({
							rateLimitId: b.rateLimitId,
							models: b.models.length > 0 ? b.models : null,
						}))
					: null,
			skipDefaultLimits: values.skipDefaultLimits,
			includeDeprecated: values.includeDeprecated,
		},
	};
}

export interface PolicyFormValues {
	displayName: string;
	description: string;
	hostKeyIds: string[];
	keySelection: KeySelection;
	models: string[];
	rlBindings: RLBindingValue[];
	skipDefaultLimits: boolean;
	enabled: boolean;
	includeDeprecated: boolean;
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	hostKeyIds: z.array(z.string()),
	keySelection: z.enum(
		KEY_SELECTION_VALUES as readonly [KeySelection, ...KeySelection[]],
	),
	models: z.array(z.string()),
	rlBindings: z.array(
		z.object({
			rateLimitId: z.string().min(1, "Pick a rate limit"),
			models: z.array(z.string()),
		}),
	),
	skipDefaultLimits: z.boolean(),
	enabled: z.boolean(),
	includeDeprecated: z.boolean(),
});

function emptyValues(): PolicyFormValues {
	return {
		displayName: "",
		description: "",
		hostKeyIds: [],
		keySelection: DEFAULT_KEY_SELECTION,
		models: [],
		rlBindings: [],
		skipDefaultLimits: false,
		enabled: true,
		includeDeprecated: false,
	};
}

function policyToValues(policy: Policy): PolicyFormValues {
	const bindings: RLBindingValue[] = (policy.spec.rlBindings ?? []).map(
		(b) => ({ rateLimitId: b.rateLimitId, models: b.models ?? [] }),
	);
	// Migrate legacy single rateLimitId → one binding covering everything.
	if (bindings.length === 0 && policy.spec.rateLimitId) {
		bindings.push({ rateLimitId: policy.spec.rateLimitId, models: [] });
	}
	return {
		displayName: displayLabel(policy.metadata),
		description: policy.metadata.description ?? "",
		hostKeyIds: policy.spec.hostKeyIds ?? [],
		keySelection: policy.spec.keySelection ?? DEFAULT_KEY_SELECTION,
		models: policy.spec.models ?? [],
		rlBindings: bindings,
		skipDefaultLimits: policy.spec.skipDefaultLimits ?? false,
		enabled: policy.spec.enabled ?? true,
		includeDeprecated: policy.spec.includeDeprecated ?? false,
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
	const updatePolicy = useUpdatePolicy(policy?.metadata.id ?? "");

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
			const cleanedBindings = value.rlBindings.filter((b) => b.rateLimitId);
			// A single binding with no model scope collapses back to the legacy
			// single-RL representation on the wire.
			const single =
				cleanedBindings.length === 1 && cleanedBindings[0]?.models.length === 0
					? cleanedBindings[0]
					: null;
			const spec = {
				enabled: value.enabled,
				hostKeyIds: value.hostKeyIds.length > 0 ? value.hostKeyIds : null,
				keySelection: value.keySelection,
				models: value.models.length > 0 ? value.models : null,
				rateLimitId: single ? single.rateLimitId : undefined,
				rlBindings:
					!single && cleanedBindings.length > 0
						? cleanedBindings.map((b) => ({
								rateLimitId: b.rateLimitId,
								models: b.models.length > 0 ? b.models : null,
							}))
						: null,
				skipDefaultLimits: value.skipDefaultLimits,
				includeDeprecated: value.includeDeprecated,
			};
			try {
				if (isEdit && policy) {
					const payload: PolicyUpdate = {
						metadata: {
							...policy.metadata,
							displayName,
							...(description
								? { description }
								: policy.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec: { ...policy.spec, ...spec },
					};
					await updatePolicy.mutateAsync(payload);
					toast("success", `Policy "${displayName}" updated.`);
				} else {
					const name = computeSlug(displayName);
					const payload: PolicyCreate = {
						metadata: {
							name,
							displayName,
							...(description ? { description } : {}),
						},
						spec,
					};
					await createPolicy.mutateAsync(payload);
					toast("success", `Policy "${displayName}" created.`);
				}
				onSaved();
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update policy."
							: "Failed to create policy.",
				);
			}
		},
	});

	useEffect(() => {
		if (open) form.reset(initial);
		else form.reset(emptyValues());
	}, [open, initial, form]);

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

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
	};
}
