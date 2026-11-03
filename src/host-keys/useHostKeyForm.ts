import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useAuth } from "@/api/auth";
import {
	type Account,
	useAccounts,
	useUsableAccountsSuspense,
} from "@/api/hooks/accounts";
import { useCreateHostKey, useUpdateHostKey } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { usePolicies } from "@/api/hooks/policies";
import { usablePoolsQuery, usePools, useUpdatePool } from "@/api/hooks/pools";
import type {
	HostKey,
	HostKeyCreate,
	HostKeyKind,
	HostKeyUpdate,
} from "@/api/types/hostkey";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useClearPicksOnSwitch, useFormOwner } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { ownerKey } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import { usablePicks } from "@/lib/workContext";
import type { CheckOption } from "@/shared/MultiSelect";
import { toast } from "@/shared/Toast";
import { keyAccountGroups } from "./hostKeyAccount";
import {
	keyCreatePlan,
	keyPoolChoices,
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
	/** The provider account the key joins; "" is no pick yet. */
	accountId: string;
	/** Pools the new key is appended to after it's created. */
	poolIds: string[];
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
		accountId: account?.metadata.id ?? "",
		poolIds: [],
		kind: "stored",
		envVar: "",
		value: "",
		enabled: true,
	};
}

function hostKeyToValues(hk: HostKey): HostKeyFormValues {
	const kind: HostKeyKind =
		hk.spec.valueFrom.kind === "stored" ? "stored" : "env";
	return {
		...emptyValues(),
		displayName: displayLabel(hk.metadata),
		description: hk.metadata.description ?? "",
		hostId: hk.spec.hostId,
		accountId: hk.spec.accountId ?? "",
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
			if (v.accountId === "") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["accountId"],
					message: "Pick the account this key belongs to, or make a new one.",
				});
			}
			if (isEdit) return;
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
	// The key's own account stays listed even if the scope's list no longer has it.
	const currentAccount = accounts.find(
		(a) => a.metadata.id === hostKey?.spec.accountId,
	);
	const listedAccounts =
		currentAccount &&
		!usableAccounts.some((a) => a.metadata.id === currentAccount.metadata.id)
			? [...usableAccounts, currentAccount]
			: usableAccounts;
	const accountGroups = keyAccountGroups(
		accountLocked && account ? [account] : listedAccounts,
		hosts,
		ownerKey(owner ?? { kind: "user" }, userId),
		userId,
	);

	const initial = useMemo<HostKeyFormValues>(
		() => (hostKey ? hostKeyToValues(hostKey) : emptyValues(account)),
		[hostKey, account],
	);
	const suffixRef = useRef<string>(
		hostKey?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string) => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		return `${slugify(trimmed) || "host-key"}-${suffixRef.current}`;
	};

	const schema = useMemo(() => buildSchema(isEdit), [isEdit]);

	const runValidation = zodFieldValidator<HostKeyFormValues>(schema);

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
					const accountId = value.accountId || undefined;
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
						createKey,
						addKeyToPool: (poolId, keyId) => addKeyToPool(poolId, keyId),
					});
					toast("success", `Credential "${displayName}" created.`);
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
	const accountIdError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.accountId, s.submissionAttempts),
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

	const poolsShown = !isEdit && values.hostId !== "" && values.accountId !== "";
	const poolsResult = useQuery({
		...usablePoolsQuery(usableBy, { host_id: [values.hostId] }),
		enabled: poolsShown,
	});
	const usablePools = poolsResult.data?.items ?? [];
	const poolChoices = poolsShown
		? keyPoolChoices(usablePools, values.hostId, values.accountId)
		: [];

	// A dropped account takes its host and pools with it, as a re-pick would.
	function clearUnusablePicks(): boolean {
		const { accountId, poolIds } = form.state.values;
		if (
			accountId !== "" &&
			!usableAccounts.some((a) => a.metadata.id === accountId)
		) {
			form.setFieldValue("accountId", "");
			form.setFieldValue("hostId", "");
			form.setFieldValue("poolIds", []);
			return true;
		}
		const keptPools = usablePicks(poolIds, usablePools);
		if (keptPools.length === poolIds.length) return false;
		form.setFieldValue("poolIds", keptPools);
		return true;
	}
	const shownPlacement = useClearPicksOnSwitch(
		placement,
		usableBy,
		!poolsShown || poolsResult.isSuccess,
		clearUnusablePicks,
	);
	const poolOptions: CheckOption[] = poolChoices.map((c) => ({
		value: c.id,
		label: c.label,
		...(c.implied ? { disabled: true, hint: "includes this account" } : {}),
	}));
	const checkedPoolIds = [
		...values.poolIds,
		...poolChoices.filter((c) => c.implied).map((c) => c.id),
	];

	// Picking an account fixes the host; the pools on offer follow it.
	function setKeyAccount(accountId: string) {
		const picked = accountGroups
			.flatMap((g) => g.accounts)
			.find((a) => a.value === accountId);
		if (picked) pickAccount(accountId, picked.hostId);
	}

	// The created account isn't in this render's groups yet, so it brings its own host.
	function selectCreatedAccount(created: Account) {
		const { id } = created.metadata;
		const { hostId } = created.spec;
		if (id && hostId) pickAccount(id, hostId);
	}

	function pickAccount(accountId: string, hostId: string) {
		form.setFieldValue("accountId", accountId);
		form.setFieldValue("hostId", hostId);
		form.setFieldValue("poolIds", []);
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
		placement: shownPlacement,
		accountIdError,
		envVarError,
		envVarReservedPrefix,
		valueError,
		accountGroups,
		accountLocked,
		attachedPolicies,
		poolsShown,
		poolOptions,
		checkedPoolIds,
		setKeyAccount,
		selectCreatedAccount,
		togglePool,
	};
}
