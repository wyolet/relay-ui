import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import {
	type AccountsListParams,
	accountListQueryOptions,
	usableAccountsQuery,
	useUsableAccounts,
} from "@/api/hooks/accounts";
import {
	usableHostKeysQuery,
	useHostKeys,
	useUsableHostKeys,
} from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { type Pool, useCreatePool, useUpdatePool } from "@/api/hooks/pools";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useScopePrefetch } from "@/hooks/useScopePrefetch";
import { useFormOwner } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	unavailablePicks,
	unavailablePicksError,
	updatingScope,
} from "@/lib/workContext";
import {
	moveItem,
	POOL_SELECTIONS,
	type PoolSelection,
} from "@/pools/poolKeys";
import {
	availableAccounts,
	chosenAccounts,
	type PoolMemberOption,
	unknownMember,
} from "@/pools/poolMembers";
import { toast } from "@/shared/Toast";

export interface PoolFormValues {
	displayName: string;
	description: string;
	hostId: string;
	/** Ordered: tried before the single keys, each account's keys in turn. */
	accountIds: string[];
	/** Ordered: the preference for prioritized selection. */
	credentialIds: string[];
	selection: PoolSelection;
}

type MemberField = "accountIds" | "credentialIds";

/** The provider accounts at the pool's host. */
function hostAccountsParams(hostId: string): AccountsListParams {
	return { kind: ["provider"], host_id: [hostId] };
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	hostId: z.string().min(1, "Pick the host every key in the pool is at."),
	accountIds: z.array(z.string()),
	credentialIds: z.array(z.string()),
	selection: z.enum(POOL_SELECTIONS),
});

function emptyValues(): PoolFormValues {
	return {
		displayName: "",
		description: "",
		hostId: "",
		accountIds: [],
		credentialIds: [],
		selection: "prioritized",
	};
}

function toValues(pool: Pool): PoolFormValues {
	return {
		displayName: displayLabel(pool.metadata),
		description: pool.metadata.description ?? "",
		hostId: pool.spec.hostId,
		accountIds: pool.spec.accountIds ?? [],
		credentialIds: pool.spec.credentialIds ?? [],
		selection: pool.spec.selection ?? "prioritized",
	};
}

interface UsePoolFormOptions {
	pool?: Pool;
	onSaved: (savedName: string) => void;
}

export function usePoolForm({ pool, onSaved }: UsePoolFormOptions) {
	const isEdit = pool !== undefined;
	const createPool = useCreatePool();
	const updatePool = useUpdatePool();
	const toastSaveError = useSaveErrorToast();
	const queryClient = useQueryClient();
	const { data: hostsData } = useHosts();
	const { data: hostKeysData } = useHostKeys();
	const loaded = useLoadedResourceVersion(
		pool?.metadata.id ?? "",
		pool?.metadata.resourceVersion,
	);

	const { owner, usableBy, placement } = useFormOwner(pool?.metadata);

	const initial = useMemo<PoolFormValues>(
		() => (pool ? toValues(pool) : emptyValues()),
		[pool],
	);
	const suffixRef = useRef<string>(randomSuffix());
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		return `${slugify(trimmed) || "pool"}-${suffixRef.current}`;
	};

	const runValidation = zodFieldValidator<PoolFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			// Flagged picks block the save; their field error says what to do.
			if (unavailableAccounts || unavailableKeys) return;
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const spec = {
				hostId: value.hostId,
				accountIds: value.accountIds,
				credentialIds: value.credentialIds,
				selection: value.selection,
			};
			try {
				if (isEdit && pool) {
					const saved = await updatePool.mutateAsync({
						id: pool.metadata.id ?? "",
						body: {
							metadata: {
								...pool.metadata,
								resourceVersion: loaded.version,
								displayName,
								description,
							},
							spec,
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Pool "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createPool.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							...(owner ? { owner } : {}),
							...(description ? { description } : {}),
						},
						spec,
					});
					toast("success", `Pool "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				toastSaveError(
					err,
					isEdit ? "Failed to update pool." : "Failed to create pool.",
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
	const { hostId } = values;
	const keysList = useUsableHostKeys(usableBy, hostId);
	const accountsList = useUsableAccounts(
		usableBy,
		hostAccountsParams(hostId),
		"pool",
		{ enabled: hostId !== "" },
	);
	const usableKeys = keysList.items;
	const usableAccounts = accountsList.items;
	const unavailableAccounts = unavailablePicks(
		values.accountIds,
		accountsList,
		placement,
	);
	const unavailableKeys = unavailablePicks(
		values.credentialIds,
		keysList,
		placement,
	);
	const submitTried = useStore(form.store, (s) => s.submissionAttempts > 0);

	const prefetchMembers = useCallback(
		(scope: string) => {
			void queryClient.prefetchQuery(usableHostKeysQuery(scope, hostId));
			void queryClient.prefetchQuery(
				usableAccountsQuery(scope, hostAccountsParams(hostId), "pool"),
			);
		},
		[queryClient, hostId],
	);
	useScopePrefetch(placement?.editable && hostId ? prefetchMembers : undefined);

	// Names accounts already in the pool that the current scope may no longer use.
	const { data: visibleAccounts } = useQuery(accountListQueryOptions);
	const errors = useStore(form.store, (s) => ({
		displayName: shownError(s.fieldMeta?.displayName, s.submissionAttempts),
		description: shownError(s.fieldMeta?.description, s.submissionAttempts),
		hostId: shownError(s.fieldMeta?.hostId, s.submissionAttempts),
	}));

	const hostOptions = (hostsData.items ?? []).map((h) => ({
		value: h.metadata.id ?? "",
		label: displayLabel(h.metadata),
	}));

	const keyById = new Map<string, PoolMemberOption>();
	for (const hk of hostKeysData.items ?? []) {
		if (!hk.metadata.id) continue;
		keyById.set(hk.metadata.id, {
			id: hk.metadata.id,
			label: displayLabel(hk.metadata),
			name: hk.metadata.name,
			enabled: hk.spec.enabled ?? true,
			known: true,
		});
	}
	const chosenKeys: PoolMemberOption[] = values.credentialIds.map(
		(id) => keyById.get(id) ?? unknownMember(id),
	);
	const chosen = new Set(values.credentialIds);
	const availableKeys: PoolMemberOption[] = usableKeys.flatMap((hk) => {
		const option = keyById.get(hk.metadata.id ?? "");
		return option && hk.spec.hostId === values.hostId && !chosen.has(option.id)
			? [option]
			: [];
	});

	function setHost(hostId: string) {
		form.setFieldValue("hostId", hostId);
		// Every account and key must be at the pool's host.
		form.setFieldValue("accountIds", []);
		form.setFieldValue("credentialIds", []);
	}
	function setSelection(selection: PoolSelection) {
		form.setFieldValue("selection", selection);
	}
	function memberEdits(field: MemberField) {
		const ids = values[field];
		return {
			add: (id: string) => form.setFieldValue(field, [...ids, id]),
			remove: (id: string) =>
				form.setFieldValue(
					field,
					ids.filter((k) => k !== id),
				),
			move: (index: number, delta: -1 | 1) =>
				form.setFieldValue(field, moveItem(ids, index, delta)),
		};
	}

	return {
		form,
		values,
		errors,
		isEdit,
		slugPreview: pool ? pool.metadata.name : computeSlug(values.displayName),
		placement,
		updatingFor: updatingScope(placement, keysList, accountsList),
		unavailableAccounts,
		unavailableKeys,
		membersError: unavailablePicksError(
			unavailableAccounts ?? unavailableKeys,
			submitTried,
		),
		hostOptions,
		chosenAccounts: chosenAccounts(values.accountIds, [
			...usableAccounts,
			...(visibleAccounts?.items ?? []),
		]),
		availableAccounts: availableAccounts(
			usableAccounts,
			values.hostId,
			values.accountIds,
		),
		chosenKeys,
		availableKeys,
		setHost,
		setSelection,
		accountEdits: memberEdits("accountIds"),
		keyEdits: memberEdits("credentialIds"),
	};
}
