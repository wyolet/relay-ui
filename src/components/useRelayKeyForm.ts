import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useCreateRelayKey, useUpdateRelayKey } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { RelayKey } from "@/api/types/relayKey";
import { toast } from "@/components/Toast";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";

export interface RelayKeyFormValues {
	displayName: string;
	description: string;
	policyId: string;
	enabled: boolean;
	passthroughAllowed: boolean;
}

function emptyValues(): RelayKeyFormValues {
	return {
		displayName: "",
		description: "",
		policyId: "",
		enabled: true,
		passthroughAllowed: false,
	};
}

function relayKeyToValues(rk: RelayKey): RelayKeyFormValues {
	return {
		displayName: displayLabel(rk.metadata),
		description: rk.metadata.description ?? "",
		policyId: rk.spec.policyId,
		enabled: rk.spec.enabled ?? true,
		passthroughAllowed: rk.spec.passthroughAllowed ?? false,
	};
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	policyId: z.string().min(1, "Pick the policy this key authorizes against."),
	enabled: z.boolean(),
	passthroughAllowed: z.boolean(),
});

// rly_sk_<48 base62 chars>
const SECRET_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SECRET_BODY_LEN = 48;
const SECRET_PREFIX = "rly_sk_";
const PREFIX_PREVIEW_LEN = 8;

function generatePlaintext(): string {
	const buf = new Uint32Array(SECRET_BODY_LEN);
	crypto.getRandomValues(buf);
	let out = "";
	for (let i = 0; i < SECRET_BODY_LEN; i += 1) {
		out += SECRET_ALPHABET.charAt(buf[i] % SECRET_ALPHABET.length);
	}
	return `${SECRET_PREFIX}${out}`;
}

async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", data);
	const bytes = new Uint8Array(digest);
	let hex = "";
	for (const b of bytes) hex += b.toString(16).padStart(2, "0");
	return hex;
}

interface UseRelayKeyFormOptions {
	open?: boolean;
	relayKey?: RelayKey;
	onSaved: (savedName: string) => void;
	onCreated?: (plaintext: string) => void;
}

export function useRelayKeyForm({
	open = true,
	relayKey,
	onSaved,
	onCreated,
}: UseRelayKeyFormOptions) {
	const isEdit = relayKey !== undefined;
	const createRelayKey = useCreateRelayKey();
	const updateRelayKey = useUpdateRelayKey();

	const initial = useMemo<RelayKeyFormValues>(
		() => (relayKey ? relayKeyToValues(relayKey) : emptyValues()),
		[relayKey],
	);
	const suffixRef = useRef<string>(
		relayKey?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "relay-key";
		return `${base}-${suffixRef.current}`;
	};

	const [freshSecret, setFreshSecret] = useState<string | null>(null);

	function runValidation({ value }: { value: RelayKeyFormValues }) {
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
				if (isEdit && relayKey) {
					const payload: RelayKey = {
						metadata: {
							...relayKey.metadata,
							displayName,
							...(description
								? { description }
								: relayKey.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec: {
							...relayKey.spec,
							policyId: value.policyId,
							enabled: value.enabled,
							passthroughAllowed: value.passthroughAllowed,
						},
					};
					const saved = await updateRelayKey.mutateAsync({
						id: relayKey.metadata.id ?? "",
						body: payload,
					});
					toast("success", `Relay key "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const name = computeSlug(displayName);
					const plaintext = generatePlaintext();
					const keyHash = await sha256Hex(plaintext);
					const prefix = plaintext.slice(0, PREFIX_PREVIEW_LEN);
					const payload: RelayKey = {
						metadata: {
							name,
							displayName,
							...(description ? { description } : {}),
						},
						spec: {
							keyHash,
							policyId: value.policyId,
							prefix,
							enabled: value.enabled,
							passthroughAllowed: value.passthroughAllowed,
						},
					};
					const saved = await createRelayKey.mutateAsync(payload);
					setFreshSecret(plaintext);
					onCreated?.(plaintext);
					toast("success", `Relay key "${displayName}" created.`);
					onSaved(saved.metadata.name);
				}
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update relay key."
							: "Failed to create relay key.",
				);
			}
		},
	});

	useEffect(() => {
		if (open) form.reset(initial);
		else {
			form.reset(emptyValues());
			setFreshSecret(null);
		}
	}, [open, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (relayKey?.metadata.name ?? "")
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
		policyIdError,
		freshSecret,
	};
}
