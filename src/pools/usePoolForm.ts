import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { type Pool, useCreatePool, useUpdatePool } from "@/api/hooks/pools";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useOwnerOptions } from "@/hooks/useOwnerOptions";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { ALL_OWNER_SCOPES, PERSONAL_OWNER } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	moveItem,
	POOL_SELECTIONS,
	type PoolSelection,
} from "@/pools/poolKeys";
import { toast } from "@/shared/Toast";

export interface PoolFormValues {
	displayName: string;
	description: string;
	owner: string;
	hostId: string;
	/** Ordered: the preference for prioritized selection. */
	credentialIds: string[];
	selection: PoolSelection;
}

export interface PoolKeyOption {
	id: string;
	label: string;
	name: string;
	enabled: boolean;
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	owner: z.string().min(1, "Pick who owns this pool."),
	hostId: z.string().min(1, "Pick the host every key in the pool is at."),
	credentialIds: z.array(z.string()),
	selection: z.enum(POOL_SELECTIONS),
});

function firstError(
	errors: readonly unknown[] | undefined,
): string | undefined {
	for (const e of errors ?? []) if (typeof e === "string") return e;
	return undefined;
}

function emptyValues(owner: string): PoolFormValues {
	return {
		displayName: "",
		description: "",
		owner,
		hostId: "",
		credentialIds: [],
		selection: "prioritized",
	};
}

function toValues(pool: Pool, owner: string): PoolFormValues {
	return {
		displayName: displayLabel(pool.metadata),
		description: pool.metadata.description ?? "",
		owner,
		hostId: pool.spec.hostId,
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
	const { data: hostsData } = useHosts();
	const { data: hostKeysData } = useHostKeys();
	const loaded = useLoadedResourceVersion(
		pool?.metadata.id ?? "",
		pool?.metadata.resourceVersion,
	);

	const ownerPicker = useOwnerOptions({
		kinds: ALL_OWNER_SCOPES,
		owner: pool?.metadata.owner,
		preset: PERSONAL_OWNER,
	});
	const { initialOwner } = ownerPicker;

	const initial = useMemo<PoolFormValues>(
		() => (pool ? toValues(pool, initialOwner) : emptyValues(initialOwner)),
		[pool, initialOwner],
	);
	const suffixRef = useRef<string>(randomSuffix());
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		return `${slugify(trimmed) || "pool"}-${suffixRef.current}`;
	};

	function runValidation({ value }: { value: PoolFormValues }) {
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
			const owner = ownerPicker.toOwner(value.owner);
			const spec = {
				hostId: value.hostId,
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
								owner,
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
							owner,
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
	const errors = useStore(form.store, (s) => ({
		displayName: firstError(s.fieldMeta?.displayName?.errors),
		description: firstError(s.fieldMeta?.description?.errors),
		owner: firstError(s.fieldMeta?.owner?.errors),
		hostId: firstError(s.fieldMeta?.hostId?.errors),
	}));

	const hostOptions = (hostsData.items ?? []).map((h) => ({
		value: h.metadata.id ?? "",
		label: displayLabel(h.metadata),
	}));

	const keyById = new Map<string, PoolKeyOption>();
	for (const hk of hostKeysData.items ?? []) {
		if (!hk.metadata.id) continue;
		keyById.set(hk.metadata.id, {
			id: hk.metadata.id,
			label: displayLabel(hk.metadata),
			name: hk.metadata.name,
			enabled: hk.spec.enabled ?? true,
		});
	}
	const chosenKeys: PoolKeyOption[] = values.credentialIds.map(
		(id) =>
			keyById.get(id) ?? {
				id,
				label: `Unknown (${id.slice(0, 8)}…)`,
				name: id,
				enabled: true,
			},
	);
	const chosen = new Set(values.credentialIds);
	const availableKeys: PoolKeyOption[] = (hostKeysData.items ?? []).flatMap(
		(hk) => {
			const option = keyById.get(hk.metadata.id ?? "");
			return option &&
				hk.spec.hostId === values.hostId &&
				!chosen.has(option.id)
				? [option]
				: [];
		},
	);

	function setHost(hostId: string) {
		form.setFieldValue("hostId", hostId);
		// Every key must be at the pool's host.
		form.setFieldValue("credentialIds", []);
	}
	function setSelection(selection: PoolSelection) {
		form.setFieldValue("selection", selection);
	}
	function addKey(id: string) {
		form.setFieldValue("credentialIds", [...values.credentialIds, id]);
	}
	function removeKey(id: string) {
		form.setFieldValue(
			"credentialIds",
			values.credentialIds.filter((k) => k !== id),
		);
	}
	function moveKey(index: number, delta: -1 | 1) {
		form.setFieldValue(
			"credentialIds",
			moveItem(values.credentialIds, index, delta),
		);
	}

	return {
		form,
		values,
		errors,
		isEdit,
		slugPreview: pool ? pool.metadata.name : computeSlug(values.displayName),
		ownerOptions: ownerPicker.options,
		hostOptions,
		chosenKeys,
		availableKeys,
		setHost,
		setSelection,
		addKey,
		removeKey,
		moveKey,
	};
}
