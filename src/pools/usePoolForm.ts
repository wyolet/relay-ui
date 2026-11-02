import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useHostKeys, useUsableHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { type Pool, useCreatePool, useUpdatePool } from "@/api/hooks/pools";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useFormOwner } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
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
	hostId: z.string().min(1, "Pick the host every key in the pool is at."),
	credentialIds: z.array(z.string()),
	selection: z.enum(POOL_SELECTIONS),
});

function emptyValues(): PoolFormValues {
	return {
		displayName: "",
		description: "",
		hostId: "",
		credentialIds: [],
		selection: "prioritized",
	};
}

function toValues(pool: Pool): PoolFormValues {
	return {
		displayName: displayLabel(pool.metadata),
		description: pool.metadata.description ?? "",
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
			const displayName = value.displayName.trim();
			const description = value.description.trim();
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
	const usableKeys = useUsableHostKeys(usableBy, values.hostId);
	const errors = useStore(form.store, (s) => ({
		displayName: shownError(s.fieldMeta?.displayName, s.submissionAttempts),
		description: shownError(s.fieldMeta?.description, s.submissionAttempts),
		hostId: shownError(s.fieldMeta?.hostId, s.submissionAttempts),
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
	const availableKeys: PoolKeyOption[] = usableKeys.flatMap((hk) => {
		const option = keyById.get(hk.metadata.id ?? "");
		return option && hk.spec.hostId === values.hostId && !chosen.has(option.id)
			? [option]
			: [];
	});

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
		placement,
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
