import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreateHostKey, useUpdateHostKey } from "@/api/hooks/hostkeys";
import { ApiError } from "@/api/types/errors";
import type {
	HostKey,
	HostKeyCreate,
	HostKeyKind,
	HostKeyUpdate,
} from "@/api/types/hostkey";
import { toast } from "@/components/Toast";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";

export const HOST_KEY_KINDS: readonly HostKeyKind[] = [
	"stored",
	"env",
] as const;

export interface HostKeyFormValues {
	displayName: string;
	description: string;
	hostId: string;
	policyId: string;
	kind: HostKeyKind;
	envVar: string;
	value: string;
}

function emptyValues(): HostKeyFormValues {
	return {
		displayName: "",
		description: "",
		hostId: "",
		policyId: "",
		kind: "stored",
		envVar: "",
		value: "",
	};
}

function hostKeyToValues(hk: HostKey): HostKeyFormValues {
	const kind: HostKeyKind =
		hk.spec.valueFrom.kind === "stored" ? "stored" : "env";
	return {
		displayName: displayLabel(hk.metadata),
		description: hk.metadata.description ?? "",
		hostId: hk.spec.hostId,
		policyId: hk.spec.policyId,
		kind,
		envVar: hk.spec.valueFrom.env ?? "",
		value: "",
	};
}

function buildSchema(isEdit: boolean, originalKind: HostKeyKind | null) {
	return z
		.object({
			displayName: z
				.string()
				.trim()
				.min(1, "Display name is required — the slug is generated from it")
				.max(120, "Display name is too long"),
			description: z.string().trim().max(500, "Description is too long"),
			hostId: z.string().min(1, "Pick the host this credential authenticates against."),
			policyId: z.string().min(1, "Pick the policy this credential belongs to."),
			kind: z.enum(["stored", "env"]),
			envVar: z.string().trim().max(200),
			value: z.string().max(8192),
		})
		.superRefine((v, ctx) => {
			if (v.kind === "env" && !v.envVar.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["envVar"],
					message: "Environment variable name is required.",
				});
			}
			const valueRequired =
				v.kind === "stored" && (!isEdit || originalKind !== "stored");
			if (valueRequired && !v.value.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["value"],
					message: isEdit
						? "Secret value is required when switching to a stored key."
						: "Secret value is required.",
				});
			}
		});
}

interface UseHostKeyFormOptions {
	open: boolean;
	hostKey?: HostKey;
	onSaved: (savedName: string) => void;
}

export function useHostKeyForm({
	open,
	hostKey,
	onSaved,
}: UseHostKeyFormOptions) {
	const isEdit = hostKey !== undefined;
	const createHostKey = useCreateHostKey();
	const updateHostKey = useUpdateHostKey(hostKey?.metadata.id ?? "");

	const originalKind: HostKeyKind | null = hostKey
		? hostKey.spec.valueFrom.kind === "stored"
			? "stored"
			: "env"
		: null;

	const initial = useMemo<HostKeyFormValues>(
		() => (hostKey ? hostKeyToValues(hostKey) : emptyValues()),
		[hostKey],
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

	const schema = useMemo(
		() => buildSchema(isEdit, originalKind),
		[isEdit, originalKind],
	);

	function runValidation({ value }: { value: HostKeyFormValues }) {
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
			const envVar = value.envVar.trim();
			const newValue = value.value;

			try {
				if (isEdit && hostKey) {
					const baseSpec = hostKey.spec;
					const nextSpec =
						value.kind === "env"
							? {
									...baseSpec,
									valueFrom: { kind: "env", env: envVar },
									value: undefined,
								}
							: {
									...baseSpec,
									valueFrom: { kind: "stored" },
									...(newValue.length > 0 ? { value: newValue } : {}),
								};
					const payload: HostKeyUpdate = {
						metadata: {
							...hostKey.metadata,
							displayName,
							...(description
								? { description }
								: hostKey.metadata.description !== undefined
									? { description: "" }
									: {}),
						},
						spec: nextSpec,
					};
					const saved = await updateHostKey.mutateAsync(payload);
					toast("success", `Host key "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const name = computeSlug(displayName);
					const baseSpec = {
						hostId: value.hostId,
						policyId: value.policyId,
					};
					const spec =
						value.kind === "env"
							? { ...baseSpec, valueFrom: { kind: "env", env: envVar } }
							: { ...baseSpec, valueFrom: { kind: "stored" }, value: newValue };
					const payload: HostKeyCreate = {
						metadata: {
							name,
							displayName,
							...(description ? { description } : {}),
						},
						spec,
					};
					const saved = await createHostKey.mutateAsync(payload);
					toast("success", `Host key "${displayName}" created.`);
					onSaved(saved.metadata.name);
				}
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError
						? err.body.message
						: isEdit
							? "Failed to update host key."
							: "Failed to create host key.",
				);
			}
		},
	});

	useEffect(() => {
		if (open) form.reset(initial);
		else form.reset(emptyValues());
	}, [open, initial, form]);

	const values = useStore(form.store, (s) => s.values);
	const slugPreview = isEdit
		? (hostKey?.metadata.name ?? "")
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
	const hostIdError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.hostId?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const policyIdError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.policyId?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const envVarError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.envVar?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});
	const valueError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.value?.errors ?? [];
		for (const e of errs) if (typeof e === "string") return e;
		return undefined;
	});

	const needsValueOnEdit =
		isEdit && values.kind === "stored" && originalKind !== "stored";

	return {
		form,
		values,
		isEdit,
		originalKind,
		slugPreview,
		displayNameError,
		descriptionError,
		hostIdError,
		policyIdError,
		envVarError,
		valueError,
		needsValueOnEdit,
	};
}
