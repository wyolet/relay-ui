import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreateProject, useUpdateProject } from "@/api/hooks/projects";
import type { Project } from "@/api/types/project";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useFormOwner, useWorkContext } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import { contextTeamId, scopeOptions } from "@/lib/workContext";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

export interface ProjectFormValues {
	displayName: string;
	description: string;
	/** Picked only when no team is fixed by the row, the page or the context. */
	teamId: string;
	enabled: boolean;
	labels: LabelPair[];
}

function emptyValues(): ProjectFormValues {
	return {
		displayName: "",
		description: "",
		teamId: "",
		enabled: true,
		labels: [],
	};
}

function toValues(project: Project): ProjectFormValues {
	return {
		displayName: displayLabel(project.metadata),
		description: project.metadata.description ?? "",
		teamId: project.spec.teamId,
		enabled: project.spec.enabled ?? true,
		labels: toLabelPairs(project.metadata.labels),
	};
}

function buildSchema(picksTeam: boolean) {
	return z.object({
		displayName: z
			.string()
			.trim()
			.min(1, "Display name is required — the slug is generated from it")
			.max(120, "Display name is too long"),
		description: z.string().trim().max(500, "Description is too long"),
		teamId: picksTeam
			? z.string().min(1, "Pick the team this project belongs to.")
			: z.string(),
		enabled: z.boolean(),
		labels: z.array(
			z.object({ id: z.string(), key: z.string(), value: z.string() }),
		),
	});
}

interface UseProjectFormOptions {
	open?: boolean;
	project?: Project;
	/** The team when creating from a team page. */
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

	// The edited row's team, else a team page's, else the current context's.
	const { contexts, current } = useWorkContext();
	const fixedTeamId =
		project?.spec.teamId ||
		teamId ||
		(current ? contextTeamId(current) : undefined) ||
		"";
	const picksTeam = fixedTeamId === "";
	const { placement } = useFormOwner({
		owner: { kind: "team", id: fixedTeamId },
	});

	const initial = useMemo<ProjectFormValues>(
		() => (project ? toValues(project) : emptyValues()),
		[project],
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

	const schema = useMemo(() => buildSchema(picksTeam), [picksTeam]);
	const runValidation = zodFieldValidator<ProjectFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const labels = fromLabelPairs(value.labels);
			const spec = {
				teamId: fixedTeamId || value.teamId,
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
							owner: { kind: "team", id: spec.teamId },
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
		form.reset(open ? initial : emptyValues());
	}, [resetKey, open, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (project?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.displayName, s.submissionAttempts),
	);
	const descriptionError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.description, s.submissionAttempts),
	);
	const teamIdError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.teamId, s.submissionAttempts),
	);

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		picksTeam,
		placement: picksTeam ? undefined : placement,
		teamOptions: scopeOptions(contexts, "team"),
		teamIdError,
	};
}
