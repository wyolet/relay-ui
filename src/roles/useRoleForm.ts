import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreateRole, useUpdateRole } from "@/api/hooks/roles";
import { ApiError } from "@/api/types/errors";
import type { Role } from "@/api/types/role";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	fromRuleRows,
	newRuleRow,
	type RuleRow,
	toRuleRows,
} from "@/roles/RulesEditor";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

export interface RoleFormValues {
	displayName: string;
	description: string;
	enabled: boolean;
	labels: LabelPair[];
	rules: RuleRow[];
}

function emptyValues(): RoleFormValues {
	return {
		displayName: "",
		description: "",
		enabled: true,
		labels: [],
		rules: [newRuleRow()],
	};
}

function toValues(role: Role): RoleFormValues {
	return {
		displayName: displayLabel(role.metadata),
		description: role.metadata.description ?? "",
		enabled: role.spec.enabled ?? true,
		labels: toLabelPairs(role.metadata.labels),
		rules: toRuleRows(role.spec.rules),
	};
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	enabled: z.boolean(),
	labels: z.array(
		z.object({ id: z.string(), key: z.string(), value: z.string() }),
	),
	rules: z
		.array(
			z.object({
				id: z.string(),
				kinds: z.array(z.string()),
				verbs: z.array(z.string()),
			}),
		)
		.refine(
			(rows) => rows.some((r) => r.kinds.length > 0 && r.verbs.length > 0),
			"A role needs at least one rule naming a kind and a verb.",
		),
});

interface UseRoleFormOptions {
	open?: boolean;
	role?: Role;
	onSaved: (savedName: string) => void;
}

export function useRoleForm({
	open = true,
	role,
	onSaved,
}: UseRoleFormOptions) {
	const isEdit = role !== undefined;
	const createRole = useCreateRole();
	const updateRole = useUpdateRole();

	const initial = useMemo<RoleFormValues>(
		() => (role ? toValues(role) : emptyValues()),
		[role],
	);
	const suffixRef = useRef<string>(
		role?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "role";
		return `${base}-${suffixRef.current}`;
	};

	function runValidation({ value }: { value: RoleFormValues }) {
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
			const spec = { rules: fromRuleRows(value.rules), enabled: value.enabled };
			try {
				if (isEdit && role) {
					const saved = await updateRole.mutateAsync({
						id: role.metadata.id ?? "",
						body: {
							metadata: { ...role.metadata, displayName, description, labels },
							spec,
						},
					});
					toast("success", `Role "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createRole.mutateAsync({
						// Owner is stamped server-side (the creating user).
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description,
							labels,
						},
						spec,
					});
					toast("success", `Role "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update role."
							: "Failed to create role.",
				);
			}
		},
	});

	const resetKey = `${open}:${role?.metadata.id ?? ""}`;
	const lastResetKey = useRef<string | null>(null);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		form.reset(open ? initial : emptyValues());
	}, [resetKey, open, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (role?.metadata.name ?? "")
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
	const rulesError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.rules?.errors ?? [];
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
		rulesError,
	};
}
