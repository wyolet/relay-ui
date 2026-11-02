import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/api/auth";
import {
	useCreatePolicyBinding,
	useUpdatePolicyBinding,
} from "@/api/hooks/policyBindings";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { components } from "@/api/types.gen";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useOwnerOptions } from "@/hooks/useOwnerOptions";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { firstError, zodFieldValidator } from "@/lib/formErrors";
import { type OwnerOption, ownerKeyId } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	type DuplicateSubject,
	describeDuplicate,
	fromSubjectRows,
	isDuplicateBinding,
	newSubjectRow,
	SUBJECT_KIND_LABEL,
	SUBJECT_KINDS,
	type SubjectRow,
	subjectRowKey,
	toSubjectRows,
} from "@/policy-bindings/subjects";
import { useSubjectOptions } from "@/policy-bindings/useSubjectOptions";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

type Owner = components["schemas"]["Owner"];

/** Form value of a system-owned binding; the other owners use the owner-picker keys. */
const SYSTEM_OWNER = "system";

const SYSTEM_OPTION: OwnerOption = {
	value: SYSTEM_OWNER,
	kind: "system",
	label: "System",
};

/** The first string error a field carries, or undefined. */
export interface PolicyBindingFormValues {
	displayName: string;
	description: string;
	/** {@link SYSTEM_OWNER}, personal, or "team:<id>" / "project:<id>". */
	owner: string;
	policyId: string;
	subjects: SubjectRow[];
	enabled: boolean;
	labels: LabelPair[];
}

function emptyValues(owner: string): PolicyBindingFormValues {
	return {
		displayName: "",
		description: "",
		owner,
		policyId: "",
		subjects: [newSubjectRow()],
		enabled: true,
		labels: [],
	};
}

function toValues(
	binding: PolicyBinding,
	owner: string,
): PolicyBindingFormValues {
	return {
		displayName: displayLabel(binding.metadata),
		description: binding.metadata.description ?? "",
		owner,
		policyId: binding.spec.policyId,
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
	owner: z.string().min(1, "Pick who owns this binding."),
	policyId: z.string().min(1, "Pick the policy the subjects are bound to."),
	subjects: z
		.array(
			z.object({
				rowId: z.string(),
				kind: z.enum(SUBJECT_KINDS),
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

/** The stored owner as a form value; a project-owned binding follows spec.projectId. */
function bindingOwner(binding: PolicyBinding): Owner | undefined {
	if (binding.spec.projectId)
		return { kind: "project", id: binding.spec.projectId };
	return binding.metadata.owner;
}

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
	const { isAdmin } = useAuth();
	const createBinding = useCreatePolicyBinding();
	const updateBinding = useUpdatePolicyBinding();
	const toastSaveError = useSaveErrorToast();
	const subjectOptions = useSubjectOptions();
	const loaded = useLoadedResourceVersion(
		`${open}:${binding?.metadata.id ?? ""}`,
		binding?.metadata.resourceVersion,
	);
	const [duplicate, setDuplicate] = useState<DuplicateSubject | null>(null);

	const storedOwner = binding ? bindingOwner(binding) : undefined;
	const ownerPicker = useOwnerOptions({
		kinds: ["user", "team", "project"],
		owner: storedOwner,
		preset: projectId ? `project:${projectId}` : isAdmin ? SYSTEM_OWNER : "",
	});
	const { initialOwner } = ownerPicker;
	const ownerOptions = [
		...(isAdmin || initialOwner === SYSTEM_OWNER ? [SYSTEM_OPTION] : []),
		...ownerPicker.options.filter((o) => o.value !== SYSTEM_OWNER),
	];

	/** spec.projectId is set only for a project-owned binding; the owner follows it. */
	function ownerFields(key: string): { owner: Owner; projectId?: string } {
		if (key === SYSTEM_OWNER) return { owner: { kind: "system" } };
		const owner = ownerPicker.toOwner(key);
		return owner.kind === "project"
			? { owner, projectId: ownerKeyId(key) }
			: { owner };
	}

	const initial = useMemo<PolicyBindingFormValues>(
		() =>
			binding ? toValues(binding, initialOwner) : emptyValues(initialOwner),
		[binding, initialOwner],
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

	const runValidation = zodFieldValidator<PolicyBindingFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const labels = fromLabelPairs(value.labels);
			const { owner, projectId: ownerProjectId } = ownerFields(value.owner);
			const spec = {
				...(ownerProjectId ? { projectId: ownerProjectId } : {}),
				policyId: value.policyId,
				subjects: fromSubjectRows(value.subjects),
				enabled: value.enabled,
			};
			setDuplicate(null);
			try {
				if (isEdit && binding) {
					const saved = await updateBinding.mutateAsync({
						id: binding.metadata.id ?? "",
						body: {
							metadata: {
								...binding.metadata,
								resourceVersion: loaded.version,
								displayName,
								description,
								labels,
								owner,
							},
							spec,
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
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
				if (isDuplicateBinding(err)) {
					setDuplicate(
						describeDuplicate(err.body.message, (key) => {
							const row = value.subjects.find((r) => subjectRowKey(r) === key);
							const name = subjectOptions.nameOfKey(key);
							return row && name
								? `${SUBJECT_KIND_LABEL[row.kind]} "${name}"`
								: undefined;
						}),
					);
					return;
				}
				toastSaveError(
					err,
					isEdit
						? "Failed to update policy binding."
						: "Failed to create policy binding.",
					loaded.reload,
				);
			}
		},
	});

	const resetKey = loaded.resetKey;
	const lastResetKey = useRef<string | null>(null);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		form.reset(open ? initial : emptyValues(initialOwner));
	}, [resetKey, open, initial, initialOwner, form]);

	function setSubjects(next: SubjectRow[]) {
		form.setFieldValue("subjects", next);
		setDuplicate(null);
	}

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
	const ownerError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.owner?.errors),
	);
	const policyIdError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.policyId?.errors),
	);
	const subjectsFieldError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.subjects?.errors),
	);

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		ownerOptions,
		ownerError,
		policyIdError,
		subjectOptions: subjectOptions.options,
		subjectName: subjectOptions.subjectName,
		setSubjects,
		subjectsError: subjectsFieldError ?? duplicate?.message,
		duplicateSubjectKey: duplicate?.subjectKey,
	};
}
