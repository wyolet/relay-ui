import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { accountLabel } from "@/accounts/accountView";
import { useAuth } from "@/api/auth";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { useCreateKey, useUpdateKey } from "@/api/hooks/keys";
import type { CreateKeyInput, Key, KeyPrincipal } from "@/api/types/key";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { keyLaneError, servingLanes } from "@/lib/personalAccount";
import { randomSuffix, slugify } from "@/lib/slug";
import { defaultLane, laneAccounts } from "@/policy-bindings/accountLookup";
import { toast } from "@/shared/Toast";

export type PrincipalKind = KeyPrincipal["kind"];

export interface KeyFormValues {
	displayName: string;
	description: string;
	principalKind: PrincipalKind;
	/** Only used to narrow the service-account picker; never sent. */
	projectId: string;
	principalId: string;
	/** The lane account; "" leaves it to the server's default. */
	accountId: string;
	/** RFC3339 date from the <input type="date">; "" means never expires. */
	expiresAt: string;
	enabled: boolean;
	passthroughAllowed: boolean;
	payloadLoggingEnabled: boolean;
}

function emptyValues(): KeyFormValues {
	return {
		displayName: "",
		description: "",
		principalKind: "serviceaccount",
		projectId: "",
		principalId: "",
		accountId: "",
		expiresAt: "",
		enabled: true,
		passthroughAllowed: false,
		payloadLoggingEnabled: false,
	};
}

function keyToValues(rk: Key): KeyFormValues {
	return {
		displayName: displayLabel(rk.metadata),
		description: rk.metadata.description ?? "",
		principalKind: rk.spec.principal.kind,
		projectId: rk.metadata.owner?.id ?? "",
		principalId: rk.spec.principal.id,
		accountId: rk.spec.accountId ?? "",
		expiresAt: rk.spec.expiresAt?.slice(0, 10) ?? "",
		enabled: rk.spec.enabled ?? true,
		passthroughAllowed: rk.spec.passthroughAllowed ?? false,
		payloadLoggingEnabled: rk.spec.payloadLoggingEnabled ?? false,
	};
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	principalKind: z.enum(["serviceaccount", "user"]),
	projectId: z.string(),
	principalId: z.string().min(1, "Pick who this key authenticates as."),
	accountId: z.string(),
	expiresAt: z.string(),
	enabled: z.boolean(),
	passthroughAllowed: z.boolean(),
	payloadLoggingEnabled: z.boolean(),
});

/** A date-only <input> value becomes an end-of-day RFC3339 instant; empty
 * clears the expiry. */
function expiryPatch(expiresAt: string): { expiresAt?: string } {
	const trimmed = expiresAt.trim();
	if (!trimmed) return { expiresAt: undefined };
	return { expiresAt: new Date(`${trimmed}T23:59:59Z`).toISOString() };
}

interface UseKeyFormOptions {
	open?: boolean;
	apiKey?: Key;
	onSaved: (savedName: string) => void;
	onCreated?: (plaintext: string) => void;
}

export function useKeyForm({
	open = true,
	apiKey,
	onSaved,
	onCreated,
}: UseKeyFormOptions) {
	const isEdit = apiKey !== undefined;
	const createKey = useCreateKey();
	const updateKey = useUpdateKey();
	const toastSaveError = useSaveErrorToast();
	const loaded = useLoadedResourceVersion(
		`${open}:${apiKey?.metadata.id ?? ""}`,
		apiKey?.metadata.resourceVersion,
	);

	const initial = useMemo<KeyFormValues>(
		() => (apiKey ? keyToValues(apiKey) : emptyValues()),
		[apiKey],
	);
	const suffixRef = useRef<string>(
		apiKey?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "key";
		return `${base}-${suffixRef.current}`;
	};

	const [freshSecret, setFreshSecret] = useState<string | null>(null);

	const runValidation = zodFieldValidator<KeyFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: {
			onSubmit: runValidation,
			onChange: runValidation,
		},
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();

			try {
				if (isEdit && apiKey) {
					const payload: Key = {
						metadata: {
							...apiKey.metadata,
							resourceVersion: loaded.version,
							displayName,
							...(description
								? { description }
								: apiKey.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec: {
							...apiKey.spec,
							...expiryPatch(value.expiresAt),
							enabled: value.enabled,
							passthroughAllowed: value.passthroughAllowed,
							payloadLoggingEnabled: value.payloadLoggingEnabled,
							...(value.accountId ? { accountId: value.accountId } : {}),
						},
					};
					const saved = await updateKey.mutateAsync({
						id: apiKey.metadata.id ?? "",
						body: payload,
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Key "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const name = computeSlug(displayName);
					const payload: CreateKeyInput = {
						metadata: { name, displayName },
						spec: {
							principal: {
								kind: value.principalKind,
								id: value.principalId,
							},
							...(value.accountId ? { accountId: value.accountId } : {}),
							...expiryPatch(value.expiresAt),
							enabled: value.enabled,
							passthroughAllowed: value.passthroughAllowed,
							payloadLoggingEnabled: value.payloadLoggingEnabled,
						},
					};
					const { plaintext, key: created } =
						await createKey.mutateAsync(payload);
					// The create-input body can't carry a description; apply it after.
					if (description) {
						await updateKey.mutateAsync({
							id: created.metadata.id ?? "",
							body: {
								metadata: { ...created.metadata, description },
								spec: created.spec,
							},
						});
					}
					setFreshSecret(plaintext);
					onCreated?.(plaintext);
					toast("success", `Key "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				// A refused lane renders by the account field.
				if (keyLaneError(err)) return;
				toastSaveError(
					err,
					isEdit ? "Failed to update key." : "Failed to create key.",
					loaded.reload,
				);
			}
		},
	});

	// Reset only when the form opens/closes, the edited resource changes, or the
	// user reloads it — not on every `initial` identity change, so a background
	// refetch can't wipe an open draft.
	const resetKey = loaded.resetKey;
	const lastResetKey = useRef<string | null>(null);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		if (open) form.reset(initial);
		else {
			form.reset(emptyValues());
			setFreshSecret(null);
		}
	}, [resetKey, open, initial, form]);

	const values = useStore(form.store, (s) => s.values);

	// The lane picker loads non-suspending: without the list the server default applies.
	const { data: accountsData } = useQuery({
		...accountListQueryOptions,
		retry: false,
	});
	const holder = { kind: values.principalKind, id: values.principalId };
	const { userId, personalAccountEffective } = useAuth();
	const personalOff =
		holder.kind === "user" &&
		holder.id === userId &&
		personalAccountEffective?.state === "off";
	const lanes = values.principalId
		? servingLanes(laneAccounts(accountsData?.items ?? [], holder), personalOff)
		: [];
	const laneOptions = lanes.flatMap((a) =>
		a.metadata.id ? [{ value: a.metadata.id, label: accountLabel(a) }] : [],
	);
	const defaultLaneId = personalOff
		? undefined
		: defaultLane(accountsData?.items ?? [], holder)?.metadata.id;
	const laneValue = values.accountId || (defaultLaneId ?? "");

	function chooseLane(accountId: string) {
		createKey.reset();
		updateKey.reset();
		form.setFieldValue("accountId", accountId);
	}

	/** A new principal holds other accounts, so its lane starts on the default. */
	function choosePrincipal(kind: PrincipalKind, id: string) {
		form.setFieldValue("principalKind", kind);
		form.setFieldValue("principalId", id);
		chooseLane("");
	}

	const slugPreview = isEdit
		? (apiKey?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.displayName, s.submissionAttempts),
	);
	const descriptionError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.description, s.submissionAttempts),
	);
	const principalIdError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.principalId, s.submissionAttempts),
	);

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		principalIdError,
		choosePrincipal,
		chooseLane,
		laneOptions,
		laneValue,
		hasDefaultLane: defaultLaneId !== undefined,
		noLane: personalOff && laneOptions.length === 0,
		laneError: keyLaneError(createKey.error ?? updateKey.error),
		freshSecret,
	};
}
