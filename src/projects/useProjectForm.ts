import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreateProject, useUpdateProject } from "@/api/hooks/projects";
import type { Project } from "@/api/types/project";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useOwnerOptions } from "@/hooks/useOwnerOptions";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { ownerKeyId } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

export interface ProjectFormValues {
	displayName: string;
	description: string;
	/** "team:<id>"; spec.teamId is taken from it. */
	owner: string;
	enabled: boolean;
	labels: LabelPair[];
}

function emptyValues(owner: string): ProjectFormValues {
	return {
		displayName: "",
		description: "",
		owner,
		enabled: true,
		labels: [],
	};
}

function toValues(project: Project, owner: string): ProjectFormValues {
	return {
		displayName: displayLabel(project.metadata),
		description: project.metadata.description ?? "",
		owner,
		enabled: project.spec.enabled ?? true,
		labels: toLabelPairs(project.metadata.labels),
	};
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	owner: z.string().min(1, "Pick the team this project belongs to."),
	enabled: z.boolean(),
	labels: z.array(
		z.object({ id: z.string(), key: z.string(), value: z.string() }),
	),
});

interface UseProjectFormOptions {
	open?: boolean;
	project?: Project;
	/** Preselected team when creating from a team page. */
	teamId?: string;
	onSaved: (savedName: string) => void;
}

export function useProjectForm({
	open = true,
	project,
	teamId = "",
	onSaved,
}: UseProjectFormOptions) {
	const isEdit = project !== undefined;
	const createProject = useCreateProject();
	const updateProject = useUpdateProject();
	const toastSaveError = useSaveErrorToast();
	const loaded = useLoadedResourceVersion(
		`${open}:${project?.metadata.id ?? ""}`,
		project?.metadata.resourceVersion,
	);

	const ownerPicker = useOwnerOptions({
		kinds: ["team"],
		owner: project ? { kind: "team", id: project.spec.teamId } : undefined,
		preset: teamId ? `team:${teamId}` : "",
	});
	const { initialOwner } = ownerPicker;

	const initial = useMemo<ProjectFormValues>(
		() =>
			project ? toValues(project, initialOwner) : emptyValues(initialOwner),
		[project, initialOwner],
	);
	const suffixRef = useRef<string>(
		project?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "project";
		return `${base}-${suffixRef.current}`;
	};

	function runValidation({ value }: { value: ProjectFormValues }) {
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
			// Budget stays server-side until it is editable; carry the stored
			// value through so a save never clears it.
			const spec = {
				...(project?.spec ?? {}),
				teamId: ownerKeyId(value.owner),
				enabled: value.enabled,
			};
			try {
				if (isEdit && project) {
					const saved = await updateProject.mutateAsync({
						id: project.metadata.id ?? "",
						body: {
							metadata: {
								...project.metadata,
								resourceVersion: loaded.version,
								displayName,
								description,
								labels,
							},
							spec,
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Project "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createProject.mutateAsync({
						// Owner is re-derived from spec.teamId server-side.
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description,
							labels,
							owner: ownerPicker.toOwner(value.owner),
						},
						spec,
					});
					toast("success", `Project "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toastSaveError(
					err,
					isEdit ? "Failed to update project." : "Failed to create project.",
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

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (project?.metadata.name ?? "")
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
