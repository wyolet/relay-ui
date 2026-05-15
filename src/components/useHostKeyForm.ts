import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useCreateHostKey, useUpdateHostKey } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import { usePolicies } from "@/api/hooks/policies";
import { ApiError } from "@/api/types/errors";
import type {
	HostKey,
	HostKeyCreate,
	HostKeyKind,
	HostKeyUpdate,
} from "@/api/types/hostkey";
import { toast } from "@/components/Toast";
import { useDetachHostKeyFromPolicy } from "@/components/useDetachHostKeyFromPolicy";
import { displayLabel } from "@/lib/displayLabel";
import { randomSuffix, slugify } from "@/lib/slug";

export interface SelectOption {
	value: string;
	label: string;
}

export interface ReferencingPolicyView {
	id: string;
	name: string;
	label: string;
	hasDisplayName: boolean;
	description: string | undefined;
}

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

function buildSchema(isEdit: boolean) {
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
	onSaved: (savedName: string) => void;
}

export function useHostKeyForm({
	open,
	hostKey,
	onSaved,
}: UseHostKeyFormOptions) {
	const isEdit = hostKey !== undefined;
	const createHostKey = useCreateHostKey();
	const updateHostKey = useUpdateHostKey();
	const { detach, isPending: isDetachPending } = useDetachHostKeyFromPolicy();

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

	const schema = useMemo(() => buildSchema(isEdit), [isEdit]);

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
					// Secret rotation goes through the Rotate dialog on the detail
					// page. The edit form only touches identity + host/policy, so we
					// preserve the existing valueFrom/value untouched.
					const { value: _existingValue, ...specWithoutValue } = hostKey.spec;
					void _existingValue;
					const nextSpec = {
						...specWithoutValue,
						hostId: value.hostId,
						policyId: value.policyId,
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
					const saved = await updateHostKey.mutateAsync({
						id: hostKey.metadata.id ?? "",
						body: payload,
					});
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

	const { data: hostsData } = useHosts();
	const { data: policiesData } = usePolicies();

	// Policies (user-defined) that have this host key in their pool. The
	// backend includes the slug + id on `hostKey.policies`; we resolve display
	// names + description from the full policy list so we render labels, not
	// slugs.
	const attachedPolicies = useMemo<ReferencingPolicyView[]>(() => {
		const refs = hostKey?.policies ?? [];
		return refs.map((ref) => {
			const match = (policiesData.items ?? []).find(
				(p) => p.metadata.id === ref.id,
			);
			return {
				id: ref.id,
				name: ref.name,
				label: match ? displayLabel(match.metadata) : ref.name,
				hasDisplayName: match
					? match.metadata.displayName !== undefined &&
						match.metadata.displayName !== ""
					: false,
				description: match?.metadata.description?.trim() || undefined,
			};
		});
	}, [hostKey?.policies, policiesData.items]);

	const hostOptions = useMemo<SelectOption[]>(
		() =>
			(hostsData.items ?? []).map((h) => ({
				value: h.metadata.id ?? "",
				label: displayLabel(h.metadata),
			})),
		[hostsData.items],
	);

	// Host-key policies are owned by the host/provider, not the user. Today the
	// backend tags them with `owner.kind === "provider"`; once per-host
	// ownership lands we'll get `"host"` with `owner.id === hostId` too. Accept
	// either so existing data renders correctly.
	const policyOptions = useMemo<SelectOption[]>(
		() =>
			(policiesData.items ?? [])
				.filter((p) => {
					const owner = p.metadata.owner;
					if (!owner || owner.kind === "user") return false;
					if (owner.kind === "host") return owner.id === values.hostId;
					return true;
				})
				.map((p) => ({
					value: p.metadata.id ?? "",
					label: displayLabel(p.metadata),
				})),
		[policiesData.items, values.hostId],
	);

	const hostSelected = values.hostId !== "";
	const selectedHostLabel = hostOptions.find((h) => h.value === values.hostId)
		?.label;
	// Resolve the saved label from the full policy list, not from the
	// (host-filtered) dropdown options — older rows or mis-tagged owners may
	// fall outside the filter, but we still want their name to render.
	const selectedPolicyLabel = useMemo(() => {
		if (!values.policyId) return undefined;
		const match = (policiesData.items ?? []).find(
			(p) => p.metadata.id === values.policyId,
		);
		return match ? displayLabel(match.metadata) : undefined;
	}, [policiesData.items, values.policyId]);

	function setHost(hostId: string) {
		form.setFieldValue("hostId", hostId);
		// Tier list is host-scoped; clear any prior choice.
		form.setFieldValue("policyId", "");
	}

	function setPolicy(policyId: string) {
		form.setFieldValue("policyId", policyId);
	}

	async function detachFromPolicy(policyId: string) {
		if (!hostKey) {
			toast("error", "Host key not loaded.");
			return;
		}
		await detach({
			policyId,
			hostKeyId: hostKey.metadata.id ?? "",
			policies: policiesData.items ?? [],
		});
	}

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		hostIdError,
		policyIdError,
		envVarError,
		valueError,
		hostOptions,
		policyOptions,
		hostSelected,
		selectedHostLabel,
		selectedPolicyLabel,
		attachedPolicies,
		detachFromPolicy,
		isDetachPending,
		setHost,
		setPolicy,
	};
}
