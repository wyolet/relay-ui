import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreatePolicy, useUpdatePolicy } from "@/api/hooks/policies";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";
import type { Policy, PolicyCreate, PolicyUpdate } from "@/api/types/policy";
import { toast } from "@/components/Toast";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";

export type KeySelection = NonNullable<
	components["schemas"]["PolicySpec"]["keySelection"]
>;

export const KEY_SELECTION_VALUES: readonly KeySelection[] = [
	"prioritized",
	"round-robin",
	"least-recently-used",
] as const;

export const DEFAULT_KEY_SELECTION: KeySelection = "prioritized";

export type RateLimitMode = "single" | "bindings";

export interface RLBindingValue {
	rateLimitId: string;
	models: string[];
}

export interface PolicyFormValues {
	displayName: string;
	description: string;
	hostKeyIds: string[];
	keySelection: KeySelection;
	models: string[];
	rateLimitMode: RateLimitMode;
	rateLimitId: string;
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
	rateLimitMode: z.enum(["single", "bindings"]),
	rateLimitId: z.string(),
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
		rateLimitMode: "single",
		rateLimitId: "",
		rlBindings: [],
		skipDefaultLimits: false,
		enabled: true,
		includeDeprecated: false,
	};
}

function policyToValues(policy: Policy): PolicyFormValues {
	const bindings = (policy.spec.rlBindings ?? []).map((b) => ({
		rateLimitId: b.rateLimitId,
		models: b.models ?? [],
	}));
	return {
		displayName: displayLabel(policy.metadata),
		description: policy.metadata.description ?? "",
		hostKeyIds: policy.spec.hostKeyIds ?? [],
		keySelection: policy.spec.keySelection ?? DEFAULT_KEY_SELECTION,
		models: policy.spec.models ?? [],
		rateLimitMode: bindings.length > 0 ? "bindings" : "single",
		rateLimitId: policy.spec.rateLimitId ?? "",
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
			const useBindings = value.rateLimitMode === "bindings";
			const cleanedBindings = value.rlBindings.filter((b) => b.rateLimitId);
			const spec = {
				enabled: value.enabled,
				hostKeyIds: value.hostKeyIds.length > 0 ? value.hostKeyIds : null,
				keySelection: value.keySelection,
				models: value.models.length > 0 ? value.models : null,
				rateLimitId: useBindings ? undefined : value.rateLimitId || undefined,
				rlBindings:
					useBindings && cleanedBindings.length > 0
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
