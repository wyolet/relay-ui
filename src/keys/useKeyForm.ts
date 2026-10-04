import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useCreateKey, useUpdateKey } from "@/api/hooks/keys";
import { ApiError } from "@/api/types/errors";
import type { CreateKeyInput, Key } from "@/api/types/key";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";
import { toast } from "@/shared/Toast";

export type PrincipalKind = "serviceaccount" | "user";

export interface KeyFormValues {
	displayName: string;
	description: string;
	principalKind: PrincipalKind;
	/** Only used to narrow the service-account picker; never sent. */
	projectId: string;
	principalId: string;
	/** RFC3339 date from the <input type="date">; "" means never expires. */
	expiresAt: string;
	policyId: string;
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
		expiresAt: "",
		policyId: "",
		enabled: true,
		passthroughAllowed: false,
		payloadLoggingEnabled: false,
	};
}

function keyToValues(rk: Key): KeyFormValues {
	return {
		displayName: displayLabel(rk.metadata),
		description: rk.metadata.description ?? "",
		principalKind:
			rk.spec.principal.kind === "user" ? "user" : "serviceaccount",
		projectId: rk.metadata.owner?.id ?? "",
		principalId: rk.spec.principal.id,
		expiresAt: rk.spec.expiresAt?.slice(0, 10) ?? "",
		policyId: rk.spec.policyId ?? "",
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
	expiresAt: z.string(),
	policyId: z.string().min(1, "Pick the policy this key authorizes against."),
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

	function runValidation({ value }: { value: KeyFormValues }) {
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
							displayName,
							...(description
								? { description }
								: apiKey.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec: {
							...apiKey.spec,
							policyId: value.policyId,
							...expiryPatch(value.expiresAt),
							enabled: value.enabled,
							passthroughAllowed: value.passthroughAllowed,
							payloadLoggingEnabled: value.payloadLoggingEnabled,
						},
					};
					const saved = await updateKey.mutateAsync({
						id: apiKey.metadata.id ?? "",
						body: payload,
					});
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
							policyId: value.policyId,
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
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update key."
							: "Failed to create key.",
				);
			}
		},
	});

	// Reset only when the form opens/closes or the edited resource changes — not
	// on every `initial` identity change, so a background refetch can't wipe an
	// open draft.
	const resetKey = `${open}:${apiKey?.metadata.id ?? ""}`;
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
	const slugPreview = isEdit
		? (apiKey?.metadata.name ?? "")
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
	const principalIdError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.principalId?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const policyIdError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.policyId?.errors ?? [];
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
		principalIdError,
		policyIdError,
		freshSecret,
	};
}
