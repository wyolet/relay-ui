import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { useCreatePolicy, useUpdatePolicy } from "@/api/hooks/policies";
import { ApiError } from "@/api/types/errors";
import type { Policy, PolicyCreate, PolicyUpdate } from "@/api/types/policy";
import { toast } from "@/components/Toast";

export interface PolicyFormValues {
	name: string;
	provider: string;
	secrets: string[];
	models: string[];
	rateLimits: string[];
}

const nameRegex = /^[a-zA-Z0-9_.-]+$/;

const baseSchema = z.object({
	provider: z.string().trim().min(1, "Provider is required"),
	secrets: z.array(z.string()),
	models: z.array(z.string()),
	rateLimits: z.array(z.string()),
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
		provider: "",
		secrets: [],
		models: [],
		rateLimits: [],
	};
}

function policyToValues(policy: Policy): PolicyFormValues {
	// Allowed-models is not yet in PolicySpec; persist via secretSelector for now
	// so the field round-trips until the backend adds spec.models[].
	const stashed = policy.spec.secretSelector?.["ui.models"];
	const models = stashed ? stashed.split(",").filter(Boolean) : [];
	return {
		name: policy.metadata.name,
		provider: policy.spec.provider,
		secrets: policy.spec.secrets ?? [],
		models,
		rateLimits: (policy.spec.rateLimits ?? []).map((rl) => rl.Ref),
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
			// Stash allowed-models in secretSelector until backend adds spec.models[].
			// TODO(backend): drop this stash once PolicySpec.models lands.
			const selector: Record<string, string> = {
				...(policy?.spec.secretSelector ?? {}),
			};
			if (value.models.length > 0) {
				selector["ui.models"] = value.models.join(",");
			} else {
				delete selector["ui.models"];
			}
			const spec = {
				provider: value.provider.trim(),
				secrets: value.secrets.length > 0 ? value.secrets : null,
				rateLimits:
					value.rateLimits.length > 0
						? value.rateLimits.map((Ref) => ({ Ref }))
						: undefined,
				secretSelector: Object.keys(selector).length > 0 ? selector : undefined,
			};
			try {
				if (isEdit && policy) {
					const payload: PolicyUpdate = {
						metadata: policy.metadata,
						spec: { ...policy.spec, ...spec },
					};
					await updatePolicy.mutateAsync(payload);
					toast("success", `Policy "${policy.metadata.name}" updated.`);
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
	const providerError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.provider?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});

	return { form, values, isEdit, nameError, providerError };
}
