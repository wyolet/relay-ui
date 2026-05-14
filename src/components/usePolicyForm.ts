import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { useCreatePolicy, useUpdatePolicy } from "@/api/hooks/policies";
import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";
import type { Policy, PolicyCreate, PolicyUpdate } from "@/api/types/policy";
import { toast } from "@/components/Toast";
import { displayLabel } from "@/lib/displayLabel";

export type KeySelection = NonNullable<
	components["schemas"]["PolicySpec"]["keySelection"]
>;

export const KEY_SELECTION_VALUES: readonly KeySelection[] = [
	"prioritized",
	"round-robin",
	"least-recently-used",
] as const;

export const DEFAULT_KEY_SELECTION: KeySelection = "prioritized";

export interface PolicyFormValues {
	name: string;
	hostKeyIds: string[];
	keySelection: KeySelection;
	modelIds: string[];
	rateLimitId: string;
	skipDefaultLimits: boolean;
	enabled: boolean;
}

const nameRegex = /^[a-zA-Z0-9_.-]+$/;

const baseSchema = z.object({
	hostKeyIds: z.array(z.string()),
	keySelection: z.enum(
		KEY_SELECTION_VALUES as readonly [KeySelection, ...KeySelection[]],
	),
	modelIds: z.array(z.string()),
	rateLimitId: z.string(),
	skipDefaultLimits: z.boolean(),
	enabled: z.boolean(),
});

const createSchema = baseSchema.extend({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(64, "Name is too long")
		.regex(nameRegex, "Use letters, digits, _ . -"),
});

const editSchema = baseSchema.extend({ name: z.string() });

function emptyValues(): PolicyFormValues {
	return {
		name: "",
		hostKeyIds: [],
		keySelection: DEFAULT_KEY_SELECTION,
		modelIds: [],
		rateLimitId: "",
		skipDefaultLimits: false,
		enabled: true,
	};
}

function policyToValues(policy: Policy): PolicyFormValues {
	return {
		name: policy.metadata.name,
		hostKeyIds: policy.spec.hostKeyIds ?? [],
		keySelection: policy.spec.keySelection ?? DEFAULT_KEY_SELECTION,
		modelIds: policy.spec.modelIds ?? [],
		rateLimitId: policy.spec.rateLimitId ?? "",
		skipDefaultLimits: policy.spec.skipDefaultLimits ?? false,
		enabled: policy.spec.enabled ?? true,
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
	const schema = isEdit ? editSchema : createSchema;

	const form = useForm({
		defaultValues: initial,
		validators: {
			onSubmit: ({ value }) => {
				const r = schema.safeParse(value);
				if (r.success) return undefined;
				const fields: Record<string, string> = {};
				for (const issue of r.error.issues) {
					const p = issue.path[0];
					if (typeof p === "string" && !fields[p]) fields[p] = issue.message;
				}
				return { fields };
			},
		},
		onSubmit: async ({ value }) => {
			const spec = {
				enabled: value.enabled,
				hostKeyIds: value.hostKeyIds.length > 0 ? value.hostKeyIds : null,
				keySelection: value.keySelection,
				modelIds: value.modelIds.length > 0 ? value.modelIds : null,
				rateLimitId: value.rateLimitId || undefined,
				skipDefaultLimits: value.skipDefaultLimits,
			};
			try {
				if (isEdit && policy) {
					const payload: PolicyUpdate = {
						metadata: policy.metadata,
						spec: { ...policy.spec, ...spec },
					};
					await updatePolicy.mutateAsync(payload);
					toast("success", `Policy "${displayLabel(policy.metadata)}" updated.`);
				} else {
					const payload: PolicyCreate = {
						metadata: { name: value.name.trim() },
						spec,
					};
					await createPolicy.mutateAsync(payload);
					toast("success", `Policy "${payload.metadata.name}" created.`);
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
	const nameError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.name?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});

	return { form, values, isEdit, nameError };
}
