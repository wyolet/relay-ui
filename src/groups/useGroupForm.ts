import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreateGroup, useUpdateGroup } from "@/api/hooks/groups";
import { ApiError } from "@/api/types/errors";
import type { Group } from "@/api/types/group";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";
import { toast } from "@/shared/Toast";

export interface GroupFormValues {
	displayName: string;
	description: string;
	/** Comma- or newline-separated user ids; there is no users list endpoint. */
	memberIds: string;
	enabled: boolean;
}

/** Split the free-text member field into the id list the API stores. */
export function parseMemberIds(raw: string): string[] {
	const seen = new Set<string>();
	for (const part of raw.split(/[\s,]+/)) {
		const id = part.trim();
		if (id) seen.add(id);
	}
	return [...seen];
}

function emptyValues(): GroupFormValues {
	return { displayName: "", description: "", memberIds: "", enabled: true };
}

function toValues(g: Group): GroupFormValues {
	return {
		displayName: displayLabel(g.metadata),
		description: g.metadata.description ?? "",
		memberIds: (g.spec.memberIds ?? []).join("\n"),
		enabled: g.spec.enabled ?? true,
	};
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	memberIds: z.string(),
	enabled: z.boolean(),
});

interface UseGroupFormOptions {
	open?: boolean;
	group?: Group;
	onSaved: (savedName: string) => void;
}

export function useGroupForm({
	open = true,
	group,
	onSaved,
}: UseGroupFormOptions) {
	const isEdit = group !== undefined;
	const createGroup = useCreateGroup();
	const updateGroup = useUpdateGroup();

	const initial = useMemo<GroupFormValues>(
		() => (group ? toValues(group) : emptyValues()),
		[group],
	);
	const suffixRef = useRef<string>(
		group?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "group";
		return `${base}-${suffixRef.current}`;
	};

	function runValidation({ value }: { value: GroupFormValues }) {
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
			const spec = {
				memberIds: parseMemberIds(value.memberIds),
				enabled: value.enabled,
			};
			try {
				if (isEdit && group) {
					const saved = await updateGroup.mutateAsync({
						id: group.metadata.id ?? "",
						body: {
							metadata: {
								...group.metadata,
								displayName,
								description: value.description.trim(),
							},
							spec,
						},
					});
					toast("success", `Group "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createGroup.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description: value.description.trim(),
							owner: { kind: "user" },
						},
						spec,
					});
					toast("success", `Group "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update group."
							: "Failed to create group.",
				);
			}
		},
	});

	const resetKey = `${open}:${group?.metadata.id ?? ""}`;
	const lastResetKey = useRef<string | null>(null);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		form.reset(open ? initial : emptyValues());
	}, [resetKey, open, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (group?.metadata.name ?? "")
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

	function addMember(id: string) {
		const next = parseMemberIds(`${values.memberIds}\n${id}`);
		form.setFieldValue("memberIds", next.join("\n"));
	}

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		memberCount: parseMemberIds(values.memberIds).length,
		addMember,
	};
}
