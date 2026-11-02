import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { PROVIDER_KIND } from "@/accounts/accountView";
import { useAuth } from "@/api/auth";
import {
	type Account,
	useAccounts,
	useCreateAccount,
	useDeleteAccount,
	useUsableAccountsSuspense,
} from "@/api/hooks/accounts";
import { useCreateHostKey, useUpdateHostKey } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { usePolicies } from "@/api/hooks/policies";
import { usePools, useUpdatePool, useUsablePools } from "@/api/hooks/pools";
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
import type { CheckOption } from "@/shared/MultiSelect";
import { toast } from "@/shared/Toast";
import {
	accountFormValue,
	accountOptions as buildAccountOptions,
	DEFAULT_ACCOUNT,
	defaultAccountFor,
	defaultNewAccountName,
	keyAccountGroups,
	NEW_ACCOUNT,
	nextNewAccountName,
} from "./hostKeyAccount";
import {
	keyCreatePlan,
	keyPoolChoices,
	type NewAccountDraft,
	poolFailureMessage,
	poolWithKey,
	runKeyCreate,
} from "./keyCreate";
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
	/**
	 * On edit, {@link DEFAULT_ACCOUNT} means the owner's default account at the
	 * host. On create, "" is no pick yet and {@link NEW_ACCOUNT} makes one.
	 */
	accountId: string;
	newAccountName: string;
	newAccountOrgId: string;
	/** Pools the new key is appended to after it's created. */
	poolIds: string[];
	kind: HostKeyKind;
	envVar: string;
	value: string;
	enabled: boolean;
}

function emptyValues(
	account?: Account,
	startWithNewAccount = false,
): HostKeyFormValues {
	return {
		displayName: "",
		description: "",
		hostId: account?.spec.hostId ?? "",
		accountId: account?.metadata.id ?? (startWithNewAccount ? NEW_ACCOUNT : ""),
		newAccountName: "",
		newAccountOrgId: "",
		poolIds: [],
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
		...emptyValues(),
		displayName: displayLabel(hk.metadata),
		description: hk.metadata.description ?? "",
		hostId: hk.spec.hostId,
		accountId: accountFormValue(accounts, hk.spec.accountId),
		kind,
		envVar: hk.spec.valueFrom.env ?? "",
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
			newAccountName: z.string().trim().max(120, "Account name is too long"),
			newAccountOrgId: z
				.string()
				.trim()
				.max(200, "Organization id is too long"),
			poolIds: z.array(z.string()),
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
			if (isEdit) return;
			if (v.accountId === "") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["accountId"],
					message: "Pick the account this key belongs to, or a new one.",
				});
			}
			if (v.accountId === NEW_ACCOUNT && !v.newAccountName.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["newAccountName"],
					message: "Name the new account.",
				});
			}
			// Secret rotation is gated behind the dedicated Rotate dialog on the
			// detail page, so the edit form never collects a value.
			if (v.kind === "stored" && !v.value.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["value"],
					message: "Secret value is required.",
				});
			}
		});
}

function slugWithSuffix(displayName: string, fallback: string, suffix: string) {
	const trimmed = displayName.trim();
	if (!trimmed) return "";
	return `${slugify(trimmed) || fallback}-${suffix}`;
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
	const createAccount = useCreateAccount();
	const deleteAccount = useDeleteAccount();
	const updatePool = useUpdatePool();
	const toastSaveError = useSaveErrorToast();
	const { userId } = useAuth();
	const { data: hostsData } = useHosts();
	const { data: policiesData } = usePolicies();
	const { data: poolsData } = usePools();
	const { data: accountsData } = useAccounts();
	const accounts = accountsData.items ?? [];
	const hosts = hostsData.items ?? [];
	const loaded = useLoadedResourceVersion(
		`${open}:${hostKey?.metadata.id ?? ""}`,
		hostKey?.metadata.resourceVersion,
	);

	// Relay requires a key's account to have the key's owner.
	const { owner, usableBy, placement } = useFormOwner(
		hostKey?.metadata ?? account?.metadata,
	);
	const accountLocked = !hostKey && account !== undefined;
	const usableAccounts = useUsableAccountsSuspense(usableBy, {
		kind: ["provider"],
	});
	// An omitted owner is the caller's own scope.
	const accountGroups = keyAccountGroups(
		accountLocked && account ? [account] : usableAccounts,
		hosts,
		ownerKey(owner ?? { kind: "user" }, userId),
		userId,
	);
	const hasUsableAccounts = accountGroups.length > 0;

	const initial = useMemo<HostKeyFormValues>(
		() =>
			hostKey
				? hostKeyToValues(hostKey, accountsData.items ?? [])
				: emptyValues(account, !hasUsableAccounts),
		[hostKey, account, accountsData.items, hasUsableAccounts],
	);
	const suffixRef = useRef<string>(
		hostKey?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const accountSuffixRef = useRef<string>(randomSuffix());
	const computeSlug = (displayName: string) =>
		slugWithSuffix(displayName, "host-key", suffixRef.current);
	const computeAccountSlug = (displayName: string) =>
		slugWithSuffix(displayName, "account", accountSuffixRef.current);

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

			try {
				if (isEdit && hostKey) {
					const accountId = resolveAccountId(value);
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
					const plan = keyCreatePlan(value, poolChoices);
					const createKey = (accountId: string | undefined) => {
						const baseSpec = {
							hostId: value.hostId,
							enabled: value.enabled,
							...(accountId ? { accountId } : {}),
						};
						const spec: HostKeyCreate["spec"] =
							value.kind === "env"
								? { ...baseSpec, valueFrom: { kind: "env", env: envVar } }
								: {
										...baseSpec,
										valueFrom: { kind: "stored" },
										value: newValue,
									};
						return createHostKey.mutateAsync({
							metadata: {
								name: computeSlug(displayName),
								displayName,
								...(owner ? { owner } : {}),
								...(description ? { description } : {}),
							},
							spec,
						});
					};
					const { key, poolFailures } = await runKeyCreate(plan, {
						createAccount: (draft) => createNewAccount(draft),
						createKey,
						deleteAccount: (id) => deleteAccount.mutateAsync(id),
						addKeyToPool: (poolId, keyId) => addKeyToPool(poolId, keyId),
					});
					toast(
						"success",
						plan.newAccount
							? `Account "${plan.newAccount.displayName}" and credential "${displayName}" created.`
							: `Credential "${displayName}" created.`,
					);
					for (const f of poolFailures) {
						const label =
							poolChoices.find((c) => c.id === f.poolId)?.label ?? f.poolId;
						toast("error", poolFailureMessage(label, f.error));
					}
					onSaved(key.metadata.name);
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

	async function createNewAccount(draft: NewAccountDraft): Promise<string> {
		const created = await createAccount.mutateAsync({
			metadata: {
				name: computeAccountSlug(draft.displayName),
				displayName: draft.displayName,
				...(owner ? { owner } : {}),
			},
			spec: {
				kind: PROVIDER_KIND,
				hostId: draft.hostId,
				...(draft.orgId ? { orgId: draft.orgId } : {}),
			},
		});
		if (!created.metadata.id)
			throw new Error("Relay returned the account without an id.");
		return created.metadata.id;
	}

	// The pool goes back as this form loaded it, so a pool changed since
	// answers 409 rather than losing that change.
	async function addKeyToPool(poolId: string, keyId: string) {
		const pool = usablePools.find((p) => p.metadata.id === poolId);
		if (!pool) throw new Error("the pool is no longer listed.");
		await updatePool.mutateAsync({
			id: poolId,
			body: poolWithKey(pool, keyId),
		});
	}

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
	const accountIdError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.accountId, s.submissionAttempts),
	);
	const newAccountNameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.newAccountName, s.submissionAttempts),
	);
	const newAccountOrgIdError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.newAccountOrgId, s.submissionAttempts),
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
	const accountOptions = buildAccountOptions(
		usableAccounts,
		values.hostId,
		accounts.find((a) => a.metadata.id === hostKey?.spec.accountId),
	);

	const isNewAccount = values.accountId === NEW_ACCOUNT;
	const poolsShown = !isEdit && hostSelected && values.accountId !== "";
	const usablePools = useUsablePools(
		usableBy,
		{ host_id: [values.hostId] },
		{ enabled: poolsShown },
	);
	const poolChoices = poolsShown
		? keyPoolChoices(
				usablePools,
				values.hostId,
				isNewAccount ? undefined : values.accountId,
			)
		: [];
	const poolOptions: CheckOption[] = poolChoices.map((c) => ({
		value: c.id,
		label: c.label,
		...(c.implied ? { disabled: true, hint: "includes this account" } : {}),
	}));
	const checkedPoolIds = [
		...values.poolIds,
		...poolChoices.filter((c) => c.implied).map((c) => c.id),
	];

	const hostById = (hostId: string) =>
		hosts.find((h) => h.metadata.id === hostId);

	// Accounts are scoped to one host; a change drops the choice back to the
	// default account.
	function setHost(hostId: string) {
		form.setFieldValue("hostId", hostId);
		form.setFieldValue("accountId", DEFAULT_ACCOUNT);
	}

	function setAccount(accountId: string) {
		form.setFieldValue("accountId", accountId);
	}

	// Picking an account fixes the host; the pools on offer follow it.
	function setKeyAccount(accountId: string) {
		form.setFieldValue("accountId", accountId);
		form.setFieldValue("poolIds", []);
		if (accountId === NEW_ACCOUNT) {
			if (!values.newAccountName.trim()) {
				form.setFieldValue(
					"newAccountName",
					defaultNewAccountName(hostById(values.hostId)),
				);
			}
			return;
		}
		const picked = accountGroups
			.flatMap((g) => g.accounts)
			.find((a) => a.value === accountId);
		if (picked) form.setFieldValue("hostId", picked.hostId);
	}

	function setNewAccountHost(hostId: string) {
		form.setFieldValue("hostId", hostId);
		form.setFieldValue("poolIds", []);
		form.setFieldValue(
			"newAccountName",
			nextNewAccountName(
				values.newAccountName,
				defaultNewAccountName(hostById(values.hostId)),
				defaultNewAccountName(hostById(hostId)),
			),
		);
	}

	function togglePool(poolId: string) {
		form.setFieldValue(
			"poolIds",
			values.poolIds.includes(poolId)
				? values.poolIds.filter((id) => id !== poolId)
				: [...values.poolIds, poolId],
		);
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
		accountIdError,
		newAccountNameError,
		newAccountOrgIdError,
		envVarError,
		envVarReservedPrefix,
		valueError,
		hostOptions,
		accountOptions,
		accountGroups,
		hostSelected,
		accountLocked,
		isNewAccount,
		newAccountSlug: computeAccountSlug(values.newAccountName),
		attachedPolicies,
		poolsShown,
		poolOptions,
		checkedPoolIds,
		setHost,
		setAccount,
		setKeyAccount,
		setNewAccountHost,
		togglePool,
	};
}
