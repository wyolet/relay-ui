import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import {
	ACCOUNT_KIND_LABELS,
	canSetPayloadLogging,
	PROVIDER_KIND,
} from "@/accounts/accountView";
import {
	fromPayloadLoggingChoice,
	PAYLOAD_LOGGING_CHOICES,
	type PayloadLoggingChoice,
	toPayloadLoggingChoice,
} from "@/accounts/payloadLogging";
import { useHolderResolver } from "@/accounts/useHolderResolver";
import { useAuth } from "@/api/auth";
import {
	type Account,
	accountListQueryOptions,
	useCreateAccount,
	useUpdateAccount,
} from "@/api/hooks/accounts";
import { useHosts } from "@/api/hooks/hosts";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useFormOwner } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

export interface AccountFormValues {
	displayName: string;
	description: string;
	hostId: string;
	orgId: string;
	payloadLogging: PayloadLoggingChoice;
	labels: LabelPair[];
}

const baseSchema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	payloadLogging: z.enum(PAYLOAD_LOGGING_CHOICES),
	labels: z.array(
		z.object({ id: z.string(), key: z.string(), value: z.string() }),
	),
});

// Caller accounts keep the host relay gave them; only provider accounts pick one.
const providerSchema = baseSchema.extend({
	hostId: z.string().min(1, "Pick the host this account is held at."),
	orgId: z.string().trim().max(200, "Organization id is too long"),
});

function emptyValues(hostId = ""): AccountFormValues {
	return {
		displayName: "",
		description: "",
		hostId,
		orgId: "",
		payloadLogging: "inherit",
		labels: [],
	};
}

function toValues(account: Account): AccountFormValues {
	return {
		displayName: displayLabel(account.metadata),
		description: account.metadata.description ?? "",
		hostId: account.spec.hostId ?? "",
		orgId: account.spec.orgId ?? "",
		payloadLogging: toPayloadLoggingChoice(account.spec.payloadLogging),
		labels: toLabelPairs(account.metadata.labels),
	};
}

interface UseAccountFormOptions {
	account?: Account;
	/** The host a new account starts at; the user may change it. */
	presetHostId?: string;
	onSaved: (saved: Account) => void;
}

export function useAccountForm({
	account,
	presetHostId,
	onSaved,
}: UseAccountFormOptions) {
	const isEdit = account !== undefined;
	const isProvider = !account || account.spec.kind === PROVIDER_KIND;
	const queryClient = useQueryClient();
	const createAccount = useCreateAccount();
	const updateAccount = useUpdateAccount();
	const toastSaveError = useSaveErrorToast();
	const toHolder = useHolderResolver();
	const { data: hostsData } = useHosts();
	const loaded = useLoadedResourceVersion(
		account?.metadata.id ?? "",
		account?.metadata.resourceVersion,
	);

	const { owner, placement } = useFormOwner(account?.metadata);

	const initial = useMemo<AccountFormValues>(
		() => (account ? toValues(account) : emptyValues(presetHostId)),
		[account, presetHostId],
	);
	const suffixRef = useRef<string>(randomSuffix());
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		return `${slugify(trimmed) || "account"}-${suffixRef.current}`;
	};

	const runValidation = zodFieldValidator<AccountFormValues>(
		isProvider ? providerSchema : baseSchema,
	);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const orgId = value.orgId.trim();
			const labels = fromLabelPairs(value.labels);
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
								labels,
							},
							// Server-managed fields (kind, holder, closed, default) go back as read.
							spec: isProvider
								? { ...account.spec, orgId }
								: {
										...account.spec,
										payloadLogging: fromPayloadLoggingChoice(
											value.payloadLogging,
										),
									},
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Account "${displayName}" updated.`);
					onSaved(saved);
				} else {
					const created = await createAccount.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							...(owner ? { owner } : {}),
							...(description ? { description } : {}),
							...(Object.keys(labels).length > 0 ? { labels } : {}),
						},
						spec: {
							kind: PROVIDER_KIND,
							hostId: value.hostId,
							...(orgId ? { orgId } : {}),
						},
					});
					// A form that picks the new account must find it in the listed accounts.
					await queryClient.invalidateQueries(
						{ queryKey: accountListQueryOptions.queryKey },
						{ cancelRefetch: false },
					);
					toast("success", `Account "${displayName}" created.`);
					onSaved(created);
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
	const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
	const errors = useStore(form.store, (s) => ({
		displayName: shownError(s.fieldMeta?.displayName, s.submissionAttempts),
		description: shownError(s.fieldMeta?.description, s.submissionAttempts),
		hostId: shownError(s.fieldMeta?.hostId, s.submissionAttempts),
		orgId: shownError(s.fieldMeta?.orgId, s.submissionAttempts),
	}));

	const { isAdmin, userId, scopes } = useAuth();
	const payloadLoggingEditable =
		account !== undefined &&
		canSetPayloadLogging(account, { isAdmin, userId, scopes });

	const hostOptions = (hostsData.items ?? []).map((h) => ({
		value: h.metadata.id ?? "",
		label: displayLabel(h.metadata),
	}));

	return {
		form,
		values,
		errors,
		isSubmitting,
		isEdit,
		isProvider,
		payloadLoggingEditable,
		kindLabel: account ? ACCOUNT_KIND_LABELS[account.spec.kind] : undefined,
		holder: account?.spec.holder ? toHolder(account.spec.holder) : undefined,
		slugPreview: account
			? account.metadata.name
			: computeSlug(values.displayName),
		placement,
		hostOptions,
	};
}
