import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import {
	useCreatePolicyBinding,
	useUpdatePolicyBinding,
} from "@/api/hooks/policyBindings";
import { ApiError } from "@/api/types/errors";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	fromSubjectRows,
	newSubjectRow,
	type SubjectRow,
	toSubjectRows,
} from "@/role-bindings/SubjectsEditor";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

/** What the server applies when a binding declares no priority. Lower wins. */
export const DEFAULT_PRIORITY = 100;

/** The first string error a field carries, or undefined. */
function firstError(
	errors: readonly unknown[] | undefined,
): string | undefined {
	for (const e of errors ?? []) if (typeof e === "string") return e;
	return undefined;
}

export interface PolicyBindingFormValues {
	displayName: string;
	description: string;
	projectId: string;
	policyId: string;
	priority: number;
	subjects: SubjectRow[];
	enabled: boolean;
	labels: LabelPair[];
}

function emptyValues(projectId: string): PolicyBindingFormValues {
	return {
		displayName: "",
		description: "",
		projectId,
		policyId: "",
		priority: DEFAULT_PRIORITY,
		subjects: [newSubjectRow()],
		enabled: true,
		labels: [],
	};
}

function toValues(binding: PolicyBinding): PolicyBindingFormValues {
	return {
		displayName: displayLabel(binding.metadata),
		description: binding.metadata.description ?? "",
		projectId: binding.spec.projectId,
		policyId: binding.spec.policyId,
		priority: binding.spec.priority ?? DEFAULT_PRIORITY,
		subjects: toSubjectRows(binding.spec.subjects),
		enabled: binding.spec.enabled ?? true,
		labels: toLabelPairs(binding.metadata.labels),
	};
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	projectId: z.string().min(1, "Pick the project this binding lives in."),
	policyId: z.string().min(1, "Pick the policy callers resolve to."),
	priority: z
		.number()
		.int("Priority is a whole number")
		.min(0, "Priority starts at 0")
		.max(10000, "Priority tops out at 10000"),
	subjects: z
		.array(
			z.object({
				id: z.string(),
				kind: z.enum(["user", "group", "serviceaccount"]),
				value: z.string(),
			}),
		)
		.refine(
			(rows) => rows.some((r) => r.value.trim().length > 0),
			"A binding needs at least one subject.",
		),
	enabled: z.boolean(),
	labels: z.array(
		z.object({ id: z.string(), key: z.string(), value: z.string() }),
	),
});

interface UsePolicyBindingFormOptions {
	open?: boolean;
	binding?: PolicyBinding;
	/** Preselected project when creating from a project page. */
	projectId?: string;
	onSaved: (savedName: string) => void;
}

export function usePolicyBindingForm({
	open = true,
	binding,
	projectId = "",
	onSaved,
}: UsePolicyBindingFormOptions) {
	const isEdit = binding !== undefined;
	const createBinding = useCreatePolicyBinding();
	const updateBinding = useUpdatePolicyBinding();

	const initial = useMemo<PolicyBindingFormValues>(
		() => (binding ? toValues(binding) : emptyValues(projectId)),
		[binding, projectId],
	);
	const suffixRef = useRef<string>(
		binding?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "policy-binding";
		return `${base}-${suffixRef.current}`;
	};

	function runValidation({ value }: { value: PolicyBindingFormValues }) {
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
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const labels = fromLabelPairs(value.labels);
			// The scope of a policy binding is always its project; the server
			// re-derives the owner from spec.projectId.
			const owner = { kind: "project", id: value.projectId };
			const spec = {
				projectId: value.projectId,
				policyId: value.policyId,
				priority: value.priority,
				subjects: fromSubjectRows(value.subjects),
				enabled: value.enabled,
			};
			try {
				if (isEdit && binding) {
					const saved = await updateBinding.mutateAsync({
						id: binding.metadata.id ?? "",
						body: {
							metadata: {
								...binding.metadata,
								displayName,
								description,
								labels,
								owner,
							},
							spec,
						},
					});
					toast("success", `Policy binding "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createBinding.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description,
							labels,
							owner,
						},
						spec,
					});
					toast("success", `Policy binding "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update policy binding."
							: "Failed to create policy binding.",
				);
			}
		},
	});

	const resetKey = `${open}:${binding?.metadata.id ?? ""}`;
	const lastResetKey = useRef<string | null>(null);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		form.reset(open ? initial : emptyValues(projectId));
	}, [resetKey, open, initial, projectId, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (binding?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.displayName?.errors),
	);
	const descriptionError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.description?.errors),
	);
	const projectIdError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.projectId?.errors),
	);
	const policyIdError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.policyId?.errors),
	);
	const priorityError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.priority?.errors),
	);
	const subjectsError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.subjects?.errors),
	);

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		projectIdError,
		policyIdError,
		priorityError,
		subjectsError,
	};
}
