import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import {
	useCreateServiceAccount,
	useUpdateServiceAccount,
} from "@/api/hooks/serviceAccounts";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useFormOwner, useWorkContext } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import { scopeOptions } from "@/lib/workContext";
import { toast } from "@/shared/Toast";

export interface ServiceAccountFormValues {
	displayName: string;
	description: string;
	/** Picked only when neither the row nor the context fixes the project. */
	projectId: string;
	enabled: boolean;
}

function emptyValues(): ServiceAccountFormValues {
	return {
		displayName: "",
		description: "",
		projectId: "",
		enabled: true,
	};
}

function toValues(sa: ServiceAccount): ServiceAccountFormValues {
	return {
		displayName: displayLabel(sa.metadata),
		description: sa.metadata.description ?? "",
		projectId: sa.spec.projectId,
		enabled: sa.spec.enabled ?? true,
	};
}

function buildSchema(picksProject: boolean) {
	return z.object({
		displayName: z
			.string()
			.trim()
			.min(1, "Display name is required — the slug is generated from it")
			.max(120, "Display name is too long"),
		description: z.string().trim().max(500, "Description is too long"),
		projectId: picksProject
			? z.string().min(1, "Pick the project this account belongs to.")
			: z.string(),
		enabled: z.boolean(),
	});
}

interface UseServiceAccountFormOptions {
	open?: boolean;
	serviceAccount?: ServiceAccount;
	onSaved: (savedName: string) => void;
}

export function useServiceAccountForm({
	open = true,
	serviceAccount,
	onSaved,
}: UseServiceAccountFormOptions) {
	const isEdit = serviceAccount !== undefined;
	const createServiceAccount = useCreateServiceAccount();
	const updateServiceAccount = useUpdateServiceAccount();
	const toastSaveError = useSaveErrorToast();
	const loaded = useLoadedResourceVersion(
		`${open}:${serviceAccount?.metadata.id ?? ""}`,
		serviceAccount?.metadata.resourceVersion,
	);

	// The edited row's project, else the current project context.
	const { contexts, current } = useWorkContext();
	const fixedProjectId =
		serviceAccount?.spec.projectId ||
		(current?.kind === "project" ? current.id : "");
	const picksProject = fixedProjectId === "";
	const { placement } = useFormOwner({
		owner: { kind: "project", id: fixedProjectId },
	});

	const initial = useMemo<ServiceAccountFormValues>(
		() => (serviceAccount ? toValues(serviceAccount) : emptyValues()),
		[serviceAccount],
	);
	const suffixRef = useRef<string>(
		serviceAccount?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "service-account";
		return `${base}-${suffixRef.current}`;
	};

	const schema = useMemo(() => buildSchema(picksProject), [picksProject]);
	const runValidation = zodFieldValidator<ServiceAccountFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const spec = {
				projectId: fixedProjectId || value.projectId,
				enabled: value.enabled,
			};
			try {
				if (isEdit && serviceAccount) {
					const saved = await updateServiceAccount.mutateAsync({
						id: serviceAccount.metadata.id ?? "",
						body: {
							metadata: {
								...serviceAccount.metadata,
								resourceVersion: loaded.version,
								displayName,
								description,
							},
							spec,
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Service account "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createServiceAccount.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description,
							// Owner is re-derived from spec.projectId server-side.
							owner: { kind: "project", id: spec.projectId },
						},
						spec,
					});
					toast("success", `Service account "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toastSaveError(
					err,
					isEdit
						? "Failed to update service account."
						: "Failed to create service account.",
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
		? (serviceAccount?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.displayName, s.submissionAttempts),
	);
	const descriptionError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.description, s.submissionAttempts),
	);
	const projectIdError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.projectId, s.submissionAttempts),
	);

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		picksProject,
		placement: picksProject ? undefined : placement,
		projectOptions: scopeOptions(contexts, "project"),
		projectIdError,
	};
}
