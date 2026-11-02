import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import {
	type Account,
	useCreateAccount,
	useUpdateAccount,
} from "@/api/hooks/accounts";
import { useHosts } from "@/api/hooks/hosts";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useOwnerOptions } from "@/hooks/useOwnerOptions";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { firstError, zodFieldValidator } from "@/lib/formErrors";
import { ALL_OWNER_SCOPES, PERSONAL_OWNER } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import { toast } from "@/shared/Toast";

export interface AccountFormValues {
	displayName: string;
	description: string;
	owner: string;
	hostId: string;
	orgId: string;
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	owner: z.string().min(1, "Pick who owns this account."),
	hostId: z.string().min(1, "Pick the host this account is held at."),
	orgId: z.string().trim().max(200, "Organization id is too long"),
});

function emptyValues(owner: string): AccountFormValues {
	return { displayName: "", description: "", owner, hostId: "", orgId: "" };
}

function toValues(account: Account, owner: string): AccountFormValues {
	return {
		displayName: displayLabel(account.metadata),
		description: account.metadata.description ?? "",
		owner,
		hostId: account.spec.hostId,
		orgId: account.spec.orgId ?? "",
	};
}

interface UseAccountFormOptions {
	account?: Account;
	onSaved: (savedName: string) => void;
}

export function useAccountForm({ account, onSaved }: UseAccountFormOptions) {
	const isEdit = account !== undefined;
	const createAccount = useCreateAccount();
	const updateAccount = useUpdateAccount();
	const toastSaveError = useSaveErrorToast();
	const { data: hostsData } = useHosts();
	const loaded = useLoadedResourceVersion(
		account?.metadata.id ?? "",
		account?.metadata.resourceVersion,
	);

	const ownerPicker = useOwnerOptions({
		kinds: ALL_OWNER_SCOPES,
		owner: account?.metadata.owner,
		preset: PERSONAL_OWNER,
	});
	const { initialOwner } = ownerPicker;

	const initial = useMemo<AccountFormValues>(
		() =>
			account ? toValues(account, initialOwner) : emptyValues(initialOwner),
		[account, initialOwner],
	);
	const suffixRef = useRef<string>(randomSuffix());
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		return `${slugify(trimmed) || "account"}-${suffixRef.current}`;
	};

	const runValidation = zodFieldValidator<AccountFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const orgId = value.orgId.trim();
			const owner = ownerPicker.toOwner(value.owner);
			try {
				if (isEdit && account) {
					const saved = await updateAccount.mutateAsync({
						id: account.metadata.id ?? "",
						body: {
							metadata: {
								...account.metadata,
								resourceVersion: loaded.version,
								displayName,
								description,
								owner,
							},
							// `default` is server-made; send the stored flag back as is.
							spec: { ...account.spec, orgId },
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Account "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createAccount.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							owner,
							...(description ? { description } : {}),
						},
						spec: { hostId: value.hostId, ...(orgId ? { orgId } : {}) },
					});
					toast("success", `Account "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toastSaveError(
					err,
					isEdit ? "Failed to update account." : "Failed to create account.",
					loaded.reload,
				);
			}
		},
	});

	// The draft is only replaced when the user reloads after a conflict.
	const lastResetKey = useRef(loaded.resetKey);
	useEffect(() => {
		if (lastResetKey.current === loaded.resetKey) return;
		lastResetKey.current = loaded.resetKey;
		form.reset(initial);
	}, [loaded.resetKey, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const errors = useStore(form.store, (s) => ({
		displayName: firstError(s.fieldMeta?.displayName?.errors),
		description: firstError(s.fieldMeta?.description?.errors),
		owner: firstError(s.fieldMeta?.owner?.errors),
		hostId: firstError(s.fieldMeta?.hostId?.errors),
		orgId: firstError(s.fieldMeta?.orgId?.errors),
	}));

	const hostOptions = (hostsData.items ?? []).map((h) => ({
		value: h.metadata.id ?? "",
		label: displayLabel(h.metadata),
	}));

	return {
		form,
		values,
		errors,
		isEdit,
		slugPreview: account
			? account.metadata.name
			: computeSlug(values.displayName),
		ownerOptions: ownerPicker.options,
		hostOptions,
	};
}
