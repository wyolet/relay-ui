import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ACCOUNT_KIND_LABELS, accountLabel } from "@/accounts/accountView";
import { useAuth } from "@/api/auth";
import { useAccounts } from "@/api/hooks/accounts";
import {
	useCreatePolicyBinding,
	useUpdatePolicyBinding,
} from "@/api/hooks/policyBindings";
import { useProjects } from "@/api/hooks/projects";
import type { PolicyBinding } from "@/api/types/policyBinding";
import type { components } from "@/api/types.gen";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useOwnerOptions } from "@/hooks/useOwnerOptions";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import type { OwnerOption } from "@/lib/ownerScopes";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	type DuplicateAccount,
	describeDuplicate,
	inOwnerScope,
	isDuplicateBinding,
} from "@/policy-bindings/accountLookup";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

type Owner = components["schemas"]["Owner"];

/** Form value of a system-owned binding; the other owners use the owner-picker keys. */
const SYSTEM_OWNER = "system";

const SYSTEM_OPTION: OwnerOption = {
	value: SYSTEM_OWNER,
	kind: "system",
	label: "System",
};

export interface PolicyBindingFormValues {
	displayName: string;
	description: string;
	/** {@link SYSTEM_OWNER}, personal, or "team:<id>" / "project:<id>". */
	owner: string;
	policyId: string;
	accountIds: string[];
	enabled: boolean;
	labels: LabelPair[];
}

function emptyValues(owner: string): PolicyBindingFormValues {
	return {
		displayName: "",
		description: "",
		owner,
		policyId: "",
		accountIds: [],
		enabled: true,
		labels: [],
	};
}

function toValues(
	binding: PolicyBinding,
	owner: string,
): PolicyBindingFormValues {
	return {
		displayName: displayLabel(binding.metadata),
		description: binding.metadata.description ?? "",
		owner,
		policyId: binding.spec.policyId,
		accountIds: binding.spec.accountIds ?? [],
		enabled: binding.spec.enabled ?? true,
		labels: toLabelPairs(binding.metadata.labels),
	};
}

const schema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "Display name is required — the slug is generated from it")
		.max(120, "Display name is too long"),
	description: z.string().trim().max(500, "Description is too long"),
	owner: z.string().min(1, "Pick who owns this binding."),
	policyId: z.string().min(1, "Pick the policy the accounts are bound to."),
	accountIds: z
		.array(z.string())
		.min(1, "A binding needs at least one account."),
	enabled: z.boolean(),
	labels: z.array(
		z.object({ id: z.string(), key: z.string(), value: z.string() }),
	),
});

interface UsePolicyBindingFormOptions {
	open?: boolean;
	binding?: PolicyBinding;
	/** Preselected owner project when creating from a project page. */
	projectId?: string;
	onSaved: (savedName: string) => void;
}

export function usePolicyBindingForm({
	open = true,
	binding,
	projectId = "",
	onSaved,
}: UsePolicyBindingFormOptions) {
	const isEdit = binding !== undefined;
	const { isAdmin, userId } = useAuth();
	const createBinding = useCreatePolicyBinding();
	const updateBinding = useUpdatePolicyBinding();
	const toastSaveError = useSaveErrorToast();
	const { data: accountsData } = useAccounts();
	const { data: projectsData } = useProjects();
	const loaded = useLoadedResourceVersion(
		`${open}:${binding?.metadata.id ?? ""}`,
		binding?.metadata.resourceVersion,
	);
	const [duplicate, setDuplicate] = useState<DuplicateAccount | null>(null);

	const ownerPicker = useOwnerOptions({
		kinds: ["user", "team", "project"],
		owner: binding?.metadata.owner,
		preset: projectId ? `project:${projectId}` : isAdmin ? SYSTEM_OWNER : "",
	});
	const { initialOwner } = ownerPicker;
	const ownerOptions = [
		...(isAdmin || initialOwner === SYSTEM_OWNER ? [SYSTEM_OPTION] : []),
		...ownerPicker.options.filter((o) => o.value !== SYSTEM_OWNER),
	];

	function ownerOf(key: string): Owner {
		return key === SYSTEM_OWNER ? { kind: "system" } : ownerPicker.toOwner(key);
	}

	const initial = useMemo<PolicyBindingFormValues>(
		() =>
			binding ? toValues(binding, initialOwner) : emptyValues(initialOwner),
		[binding, initialOwner],
	);
	const suffixRef = useRef<string>(
		binding?.metadata.name.match(/-(\d{4,8})$/)?.[1] ?? randomSuffix(),
	);
	const computeSlug = (displayName: string): string => {
		const trimmed = displayName.trim();
		if (!trimmed) return "";
		const base = slugify(trimmed) || "policy-binding";
		return `${base}-${suffixRef.current}`;
	};

	const accounts = accountsData.items ?? [];
	function duplicateName(accountId: string): string | undefined {
		const account = accounts.find((a) => a.metadata.id === accountId);
		return account
			? `${ACCOUNT_KIND_LABELS[account.spec.kind]} account "${displayLabel(account.metadata)}"`
			: undefined;
	}

	const runValidation = zodFieldValidator<PolicyBindingFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const labels = fromLabelPairs(value.labels);
			const owner = ownerOf(value.owner);
			const spec = {
				policyId: value.policyId,
				accountIds: value.accountIds,
				enabled: value.enabled,
			};
			setDuplicate(null);
			try {
				if (isEdit && binding) {
					const saved = await updateBinding.mutateAsync({
						id: binding.metadata.id ?? "",
						body: {
							metadata: {
								...binding.metadata,
								resourceVersion: loaded.version,
								displayName,
								description,
								labels,
								owner,
							},
							spec,
						},
					});
					loaded.markSaved(saved.metadata.resourceVersion);
					toast("success", `Policy binding "${displayName}" updated.`);
					onSaved(saved.metadata.name);
				} else {
					const created = await createBinding.mutateAsync({
						metadata: {
							name: computeSlug(displayName),
							displayName,
							description,
							labels,
							owner,
						},
						spec,
					});
					toast("success", `Policy binding "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				if (isDuplicateBinding(err)) {
					setDuplicate(describeDuplicate(err.body.message, duplicateName));
					return;
				}
				toastSaveError(
					err,
					isEdit
						? "Failed to update policy binding."
						: "Failed to create policy binding.",
					loaded.reload,
				);
			}
		},
	});

	const resetKey = loaded.resetKey;
	const lastResetKey = useRef<string | null>(null);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		form.reset(open ? initial : emptyValues(initialOwner));
	}, [resetKey, open, initial, initialOwner, form]);

	function setAccountIds(next: string[]) {
		form.setFieldValue("accountIds", next);
		setDuplicate(null);
	}

	const values = useStore(form.store, (s) => s.values);

	// A personal owner carries no id until saved; scope it to the caller.
	const picked = values.owner ? ownerOf(values.owner) : undefined;
	const scope =
		picked?.kind === "user" && !picked.id
			? { kind: "user" as const, id: userId }
			: picked;
	const accountOptions = accounts
		.filter(
			(a) =>
				!scope ||
				inOwnerScope(a, scope, projectsData.items ?? []) ||
				values.accountIds.includes(a.metadata.id ?? ""),
		)
		.flatMap((a) =>
			a.metadata.id ? [{ value: a.metadata.id, label: accountLabel(a) }] : [],
		);

	const slugPreview = isEdit
		? (binding?.metadata.name ?? "")
		: computeSlug(values.displayName);
	const displayNameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.displayName, s.submissionAttempts),
	);
	const descriptionError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.description, s.submissionAttempts),
	);
	const ownerError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.owner, s.submissionAttempts),
	);
	const policyIdError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.policyId, s.submissionAttempts),
	);
	const accountIdsFieldError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.accountIds, s.submissionAttempts),
	);

	return {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		ownerOptions,
		ownerError,
		policyIdError,
		accountOptions,
		setAccountIds,
		accountIdsError: accountIdsFieldError ?? duplicate?.message,
		duplicateAccountId: duplicate?.accountId,
	};
}
