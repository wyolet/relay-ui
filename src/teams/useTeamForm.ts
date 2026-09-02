import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreateTeam, useUpdateTeam } from "@/api/hooks/teams";
import { ApiError } from "@/api/types/errors";
import type { Team } from "@/api/types/team";
import { displayLabel } from "@/lib/displayLabel";
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

	function runValidation({ value }: { value: TeamFormValues }) {
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
			const spec = { ...(team?.spec ?? {}), enabled: value.enabled };
			try {
				if (isEdit && team) {
					const saved = await updateTeam.mutateAsync({
						id: team.metadata.id ?? "",
						body: {
							metadata: { ...team.metadata, displayName, description, labels },
							spec,
						},
					});
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
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update team."
							: "Failed to create team.",
				);
			}
		},
	});

	const resetKey = `${open}:${team?.metadata.id ?? ""}`;
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

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
	};
}
