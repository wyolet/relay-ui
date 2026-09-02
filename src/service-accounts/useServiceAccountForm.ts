import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import {
	useCreateServiceAccount,
	useUpdateServiceAccount,
} from "@/api/hooks/serviceAccounts";
import { ApiError } from "@/api/types/errors";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";
import { toast } from "@/shared/Toast";

export interface ServiceAccountFormValues {
	displayName: string;
	description: string;
	projectId: string;
	policyId: string;
	enabled: boolean;
}

function emptyValues(): ServiceAccountFormValues {
	return {
		displayName: "",
		description: "",
		projectId: "",
		policyId: "",
		enabled: true,
	};
}

function toValues(sa: ServiceAccount): ServiceAccountFormValues {
	return {
		displayName: displayLabel(sa.metadata),
		description: sa.metadata.description ?? "",
		projectId: sa.spec.projectId,
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
	projectId: z.string().min(1, "Pick the project this account belongs to."),
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
				projectId: value.projectId,
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
								displayName,
								description,
							},
							spec,
						},
					});
					toast("success", `Service account "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createServiceAccount.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description,
							// Owner is re-derived from spec.projectId server-side.
							owner: { kind: "project", id: value.projectId },
						},
						spec,
					});
					toast("success", `Service account "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update service account."
							: "Failed to create service account.",
				);
			}
		},
	});

	const resetKey = `${open}:${serviceAccount?.metadata.id ?? ""}`;
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
	const projectIdError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.projectId?.errors ?? [];
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
		projectIdError,
	};
}
