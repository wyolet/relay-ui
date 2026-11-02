import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreateTeam, useUpdateTeam } from "@/api/hooks/teams";
import type { Team } from "@/api/types/team";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { firstError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

export interface TeamFormValues {
	displayName: string;
	description: string;
	enabled: boolean;
	labels: LabelPair[];
}

function emptyValues(): TeamFormValues {
	return { displayName: "", description: "", enabled: true, labels: [] };
}

function toValues(team: Team): TeamFormValues {
	return {
		displayName: displayLabel(team.metadata),
		description: team.metadata.description ?? "",
		enabled: team.spec.enabled ?? true,
		labels: toLabelPairs(team.metadata.labels),
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
});

interface UseTeamFormOptions {
	open?: boolean;
	team?: Team;
	onSaved: (savedName: string) => void;
}

export function useTeamForm({
	open = true,
	team,
	onSaved,
}: UseTeamFormOptions) {
	const isEdit = team !== undefined;
	const createTeam = useCreateTeam();
	const updateTeam = useUpdateTeam();
	const toastSaveError = useSaveErrorToast();
	const loaded = useLoadedResourceVersion(
		`${open}:${team?.metadata.id ?? ""}`,
		team?.metadata.resourceVersion,
	);

	const initial = useMemo<TeamFormValues>(
		() => (team ? toValues(team) : emptyValues()),
		[team],
	);
	const suffixRef = useRef<string>(
		team?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "team";
		return `${base}-${suffixRef.current}`;
	};

	const runValidation = zodFieldValidator<TeamFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const labels = fromLabelPairs(value.labels);
			const spec = { enabled: value.enabled };
			try {
				if (isEdit && team) {
					const saved = await updateTeam.mutateAsync({
						id: team.metadata.id ?? "",
						body: {
							metadata: {
								...team.metadata,
								resourceVersion: loaded.version,
								displayName,
								description,
								labels,
							},
							spec,
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Team "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createTeam.mutateAsync({
						// Owner is stamped server-side (the creating user).
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description,
							labels,
						},
						spec,
					});
					toast("success", `Team "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toastSaveError(
					err,
					isEdit ? "Failed to update team." : "Failed to create team.",
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
		? (team?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.displayName?.errors),
	);
	const descriptionError = useStore(form.store, (s) =>
		firstError(s.fieldMeta?.description?.errors),
	);

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
	};
}
