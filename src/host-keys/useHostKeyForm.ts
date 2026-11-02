import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useAuth } from "@/api/auth";
import {
	type Account,
	useAccounts,
	useUsableAccounts,
} from "@/api/hooks/accounts";
import { useCreateHostKey, useUpdateHostKey } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { usePolicies } from "@/api/hooks/policies";
import { usePools } from "@/api/hooks/pools";
import type {
	HostKey,
	HostKeyCreate,
	HostKeyKind,
	HostKeyUpdate,
} from "@/api/types/hostkey";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useFormOwner } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { ownerKey } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import { toast } from "@/shared/Toast";
import {
	accountFormValue,
	accountOptions as buildAccountOptions,
	DEFAULT_ACCOUNT,
	defaultAccountFor,
} from "./hostKeyAccount";
import { linkedPolicyRows } from "./linkedPolicies";
import { reservedEnvPrefix } from "./reservedEnv";

export interface SelectOption {
	value: string;
	label: string;
}

export interface HostKeyFormValues {
	displayName: string;
	description: string;
	hostId: string;
	/** {@link DEFAULT_ACCOUNT} means the owner's default account at the host. */
	accountId: string;
	kind: HostKeyKind;
	envVar: string;
	value: string;
	enabled: boolean;
}

function emptyValues(account?: Account): HostKeyFormValues {
	return {
		displayName: "",
		description: "",
		hostId: account?.spec.hostId ?? "",
		accountId: account?.metadata.id ?? DEFAULT_ACCOUNT,
		kind: "stored",
		envVar: "",
		value: "",
		enabled: true,
	};
}

function hostKeyToValues(
	hk: HostKey,
	accounts: readonly Account[],
): HostKeyFormValues {
	const kind: HostKeyKind =
		hk.spec.valueFrom.kind === "stored" ? "stored" : "env";
	return {
		displayName: displayLabel(hk.metadata),
		description: hk.metadata.description ?? "",
		hostId: hk.spec.hostId,
		accountId: accountFormValue(accounts, hk.spec.accountId),
		kind,
		envVar: hk.spec.valueFrom.env ?? "",
		value: "",
		enabled: hk.spec.enabled ?? true,
	};
}

function buildSchema(isEdit: boolean) {
	return z
		.object({
			displayName: z
				.string()
				.trim()
				.min(1, "Display name is required — the slug is generated from it")
				.max(120, "Display name is too long"),
			description: z.string().trim().max(500, "Description is too long"),
			hostId: z
				.string()
				.min(1, "Pick the host this credential authenticates against."),
			accountId: z.string(),
			kind: z.enum(["stored", "env"]),
			envVar: z.string().trim().max(200),
			value: z.string().max(8192),
			enabled: z.boolean(),
		})
		.superRefine((v, ctx) => {
			if (v.kind === "env" && !v.envVar.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["envVar"],
					message: "Environment variable name is required.",
				});
			}
			// Secret rotation is gated behind the dedicated Rotate dialog on the
			// detail page, so the edit form never collects a value.
			if (!isEdit && v.kind === "stored" && !v.value.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["value"],
					message: "Secret value is required.",
				});
			}
		});
}

interface UseHostKeyFormOptions {
	open: boolean;
	hostKey?: HostKey;
	/** Creates the key in this provider account; host and account stay fixed. */
	account?: Account;
	onSaved: (savedName: string) => void;
}

export function useHostKeyForm({
	open,
	hostKey,
	account,
	onSaved,
}: UseHostKeyFormOptions) {
	const isEdit = hostKey !== undefined;
	const createHostKey = useCreateHostKey();
	const updateHostKey = useUpdateHostKey();
	const toastSaveError = useSaveErrorToast();
	const { userId } = useAuth();
	const { data: hostsData } = useHosts();
	const { data: policiesData } = usePolicies();
	const { data: poolsData } = usePools();
	const { data: accountsData } = useAccounts();
	const accounts = accountsData.items ?? [];
	const loaded = useLoadedResourceVersion(
		`${open}:${hostKey?.metadata.id ?? ""}`,
		hostKey?.metadata.resourceVersion,
	);

	// Relay requires a key's account to have the key's owner.
	const { owner, usableBy, placement } = useFormOwner(
		hostKey?.metadata ?? account?.metadata,
	);
	const accountLocked = !hostKey && account !== undefined;

	const initial = useMemo<HostKeyFormValues>(
		() =>
			hostKey
				? hostKeyToValues(hostKey, accountsData.items ?? [])
				: emptyValues(account),
		[hostKey, account, accountsData.items],
	);
	const suffixRef = useRef<string>(
		hostKey?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "host-key";
		return `${base}-${suffixRef.current}`;
	};

	const schema = useMemo(() => buildSchema(isEdit), [isEdit]);

	const runValidation = zodFieldValidator<HostKeyFormValues>(schema);

	// An update that omits accountId keeps the stored account, so "default"
	// is sent as the default account's id when it exists.
	function resolveAccountId(value: HostKeyFormValues): string | undefined {
		if (value.accountId !== DEFAULT_ACCOUNT) return value.accountId;
		if (!hostKey) return undefined;
		return defaultAccountFor(
			accounts,
			value.hostId,
			ownerKey(hostKey.metadata.owner, userId),
			userId,
		)?.metadata.id;
	}

	const form = useForm({
		defaultValues: initial,
		validators: {
			onSubmit: runValidation,
			onChange: runValidation,
		},
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const envVar = value.envVar.trim();
			const newValue = value.value;
			const accountId = resolveAccountId(value);

			try {
				if (isEdit && hostKey) {
					// Secret rotation goes through the Rotate dialog on the detail
					// page, so the stored valueFrom/value stay untouched here.
					const {
						value: _existingValue,
						accountId: _storedAccountId,
						...specWithoutValue
					} = hostKey.spec;
					void _existingValue;
					void _storedAccountId;
					const nextSpec = {
						...specWithoutValue,
						hostId: value.hostId,
						enabled: value.enabled,
						...(accountId ? { accountId } : {}),
					};
					const payload: HostKeyUpdate = {
						metadata: {
							...hostKey.metadata,
							resourceVersion: loaded.version,
							displayName,
							...(description
								? { description }
								: hostKey.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec: nextSpec,
					};
					const saved = await updateHostKey.mutateAsync({
						id: hostKey.metadata.id ?? "",
						body: payload,
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Credential "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const name = computeSlug(displayName);
					const baseSpec = {
						hostId: value.hostId,
						enabled: value.enabled,
						...(accountId ? { accountId } : {}),
					};
					const spec: HostKeyCreate["spec"] =
						value.kind === "env"
							? { ...baseSpec, valueFrom: { kind: "env", env: envVar } }
							: { ...baseSpec, valueFrom: { kind: "stored" }, value: newValue };
					const payload: HostKeyCreate = {
						metadata: {
							name,
							displayName,
							...(owner ? { owner } : {}),
							...(description ? { description } : {}),
						},
						spec,
					};
					const saved = await createHostKey.mutateAsync(payload);
					toast("success", `Credential "${displayName}" created.`);
					onSaved(saved.metadata.name);
				}
			} catch (err) {
				toastSaveError(
					err,
					isEdit
						? "Failed to update credential."
						: "Failed to create credential.",
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
		form.reset(open ? initial : emptyValues());
	}, [resetKey, open, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (hostKey?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.displayName, s.submissionAttempts),
	);
	const descriptionError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.description, s.submissionAttempts),
	);
	const hostIdError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.hostId, s.submissionAttempts),
	);
	const envVarError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.envVar, s.submissionAttempts),
	);
	const envVarReservedPrefix = useStore(form.store, (s) =>
		s.values.kind === "env" ? reservedEnvPrefix(s.values.envVar) : undefined,
	);
	const valueError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.value, s.submissionAttempts),
	);

	const attachedPolicies = useMemo(
		() =>
			hostKey
				? linkedPolicyRows(
						hostKey,
						policiesData.items ?? [],
						poolsData.items ?? [],
					)
				: [],
		[hostKey, policiesData.items, poolsData.items],
	);

	const hostOptions = useMemo<SelectOption[]>(
		() =>
			(hostsData.items ?? []).map((h) => ({
				value: h.metadata.id ?? "",
				label: displayLabel(h.metadata),
			})),
		[hostsData.items],
	);

	const hostSelected = values.hostId !== "";
	const usableAccounts = useUsableAccounts(
		usableBy,
		{ host_id: [values.hostId], kind: ["provider"] },
		{ enabled: hostSelected },
	);
	const accountOptions =
		accountLocked && account
			? [
					{
						value: account.metadata.id ?? "",
						label: displayLabel(account.metadata),
					},
				]
			: buildAccountOptions(
					usableAccounts,
					values.hostId,
					accounts.find((a) => a.metadata.id === hostKey?.spec.accountId),
				);

	// Accounts are scoped to one host; a change drops the choice back to the
	// default account.
	function setHost(hostId: string) {
		form.setFieldValue("hostId", hostId);
		form.setFieldValue("accountId", DEFAULT_ACCOUNT);
	}

	function setAccount(accountId: string) {
		form.setFieldValue("accountId", accountId);
	}

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		placement,
		hostIdError,
		envVarError,
		envVarReservedPrefix,
		valueError,
		hostOptions,
		accountOptions,
		hostSelected,
		accountLocked,
		attachedPolicies,
		setHost,
		setAccount,
	};
}
