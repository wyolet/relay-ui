import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import {
	useCreateRoleBinding,
	useUpdateRoleBinding,
} from "@/api/hooks/roleBindings";
import { ApiError } from "@/api/types/errors";
import type { RoleBinding } from "@/api/types/roleBinding";
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

/** The first string error a field carries, or undefined. */
function firstError(
	errors: readonly unknown[] | undefined,
): string | undefined {
	for (const e of errors ?? []) if (typeof e === "string") return e;
	return undefined;
}

/** `system` is the global scope on the wire — there is no `global` alias. */
export type ScopeKind = "system" | "team" | "project";

export interface RoleBindingFormValues {
	displayName: string;
	description: string;
	roleId: string;
	scopeKind: ScopeKind;
	scopeId: string;
	subjects: SubjectRow[];
	enabled: boolean;
	labels: LabelPair[];
}

function emptyValues(
	scopeKind: ScopeKind,
	scopeId: string,
): RoleBindingFormValues {
	return {
		displayName: "",
		description: "",
		roleId: "",
		scopeKind,
		scopeId,
		subjects: [newSubjectRow()],
		enabled: true,
		labels: [],
	};
}

function toValues(binding: RoleBinding): RoleBindingFormValues {
	return {
		displayName: displayLabel(binding.metadata),
		description: binding.metadata.description ?? "",
		roleId: binding.spec.roleId,
		scopeKind: (binding.spec.scope.kind as ScopeKind) ?? "system",
		scopeId: binding.spec.scope.id ?? "",
		subjects: toSubjectRows(binding.spec.subjects),
		enabled: binding.spec.enabled ?? true,
		labels: toLabelPairs(binding.metadata.labels),
	};
}

const schema = z
	.object({
		displayName: z
			.string()
			.trim()
			.min(1, "Display name is required — the slug is generated from it")
			.max(120, "Display name is too long"),
		description: z.string().trim().max(500, "Description is too long"),
		roleId: z.string().min(1, "Pick the role this binding grants."),
		scopeKind: z.enum(["system", "team", "project"]),
		scopeId: z.string(),
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
	})
	.refine((v) => v.scopeKind === "system" || v.scopeId.length > 0, {
		path: ["scopeId"],
		message: "Pick the team or project this binding applies to.",
	});

interface UseRoleBindingFormOptions {
	open?: boolean;
	binding?: RoleBinding;
	/** Preselected scope when creating from a team or project page. */
	scopeKind?: ScopeKind;
	scopeId?: string;
	onSaved: (savedName: string) => void;
}

export function useRoleBindingForm({
	open = true,
	binding,
	scopeKind = "system",
	scopeId = "",
	onSaved,
}: UseRoleBindingFormOptions) {
	const isEdit = binding !== undefined;
	const createBinding = useCreateRoleBinding();
	const updateBinding = useUpdateRoleBinding();

	const initial = useMemo<RoleBindingFormValues>(
		() => (binding ? toValues(binding) : emptyValues(scopeKind, scopeId)),
		[binding, scopeKind, scopeId],
	);
	const suffixRef = useRef<string>(
		binding?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "role-binding";
		return `${base}-${suffixRef.current}`;
	};

	function runValidation({ value }: { value: RoleBindingFormValues }) {
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
			// The global scope carries no id, and the server re-derives the
			// owner from the scope on every write.
			const scope =
				value.scopeKind === "system"
					? { kind: "system" }
					: { kind: value.scopeKind, id: value.scopeId };
			const spec = {
				roleId: value.roleId,
				scope,
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
								owner: scope,
							},
							spec,
						},
					});
					toast("success", `Role binding "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createBinding.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description,
							labels,
							owner: scope,
						},
						spec,
					});
					toast("success", `Role binding "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update role binding."
							: "Failed to create role binding.",
				);
			}
		},
	});

	const resetKey = `${open}:${binding?.metadata.id ?? ""}`;
	const lastResetKey = useRef<string | null>(null);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		form.reset(open ? initial : emptyValues(scopeKind, scopeId));
	}, [resetKey, open, initial, scopeKind, scopeId, form]);

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
	const roleIdError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.roleId?.errors),
	);
	const scopeIdError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.scopeId?.errors),
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
		roleIdError,
		scopeIdError,
		subjectsError,
	};
}
