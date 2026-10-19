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
import { useOwnerOptions } from "@/hooks/useOwnerOptions";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { ownerKeyId } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import { toast } from "@/shared/Toast";

export interface ServiceAccountFormValues {
	displayName: string;
	description: string;
	/** "project:<id>"; spec.projectId is taken from it. */
	owner: string;
	policyId: string;
	enabled: boolean;
}

function emptyValues(owner: string): ServiceAccountFormValues {
	return {
		displayName: "",
		description: "",
		owner,
		policyId: "",
		enabled: true,
	};
}

function toValues(sa: ServiceAccount, owner: string): ServiceAccountFormValues {
	return {
		displayName: displayLabel(sa.metadata),
		description: sa.metadata.description ?? "",
		owner,
		policyId: sa.spec.policyId ?? "",
		enabled: sa.spec.enabled ?? true,
	};
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	owner: z.string().min(1, "Pick the project this account belongs to."),
	policyId: z.string(),
	enabled: z.boolean(),
});

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

	const ownerPicker = useOwnerOptions({
		kinds: ["project"],
		owner: serviceAccount
			? { kind: "project", id: serviceAccount.spec.projectId }
			: undefined,
	});
	const { initialOwner } = ownerPicker;

	const initial = useMemo<ServiceAccountFormValues>(
		() =>
			serviceAccount
				? toValues(serviceAccount, initialOwner)
				: emptyValues(initialOwner),
		[serviceAccount, initialOwner],
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

	function runValidation({ value }: { value: ServiceAccountFormValues }) {
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
			const spec = {
				projectId: ownerKeyId(value.owner),
				...(value.policyId ? { policyId: value.policyId } : {}),
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
							owner: ownerPicker.toOwner(value.owner),
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
		form.reset(open ? initial : emptyValues(initialOwner));
	}, [resetKey, open, initial, initialOwner, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (serviceAccount?.metadata.name ?? "")
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
