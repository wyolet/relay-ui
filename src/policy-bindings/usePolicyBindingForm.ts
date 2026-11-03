import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { accountLabel } from "@/accounts/accountView";
import { useAccounts, useUsableAccounts } from "@/api/hooks/accounts";
import { usePolicies, useUsablePolicies } from "@/api/hooks/policies";
import {
	useCreatePolicyBinding,
	useUpdatePolicyBinding,
} from "@/api/hooks/policyBindings";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { useLoadedResourceVersion } from "@/hooks/useLoadedResourceVersion";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { useFormOwner } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { randomSuffix, slugify } from "@/lib/slug";
import {
	bindingPolicyOptions,
	type DuplicateAccount,
	describeDuplicate,
	duplicateAccountName,
	isDuplicateBinding,
} from "@/policy-bindings/accountLookup";
import {
	fromLabelPairs,
	type LabelPair,
	toLabelPairs,
} from "@/shared/LabelsEditor";
import { toast } from "@/shared/Toast";

export interface PolicyBindingFormValues {
	displayName: string;
	description: string;
	policyId: string;
	accountIds: string[];
	enabled: boolean;
	labels: LabelPair[];
}

function emptyValues(): PolicyBindingFormValues {
	return {
		displayName: "",
		description: "",
		policyId: "",
		accountIds: [],
		enabled: true,
		labels: [],
	};
}

function toValues(binding: PolicyBinding): PolicyBindingFormValues {
	return {
		displayName: displayLabel(binding.metadata),
		description: binding.metadata.description ?? "",
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
	/** The owner project when creating from a project page. */
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
	const createBinding = useCreatePolicyBinding();
	const updateBinding = useUpdatePolicyBinding();
	const toastSaveError = useSaveErrorToast();
	const { data: accountsData } = useAccounts();
	const { data: policiesData } = usePolicies();
	const loaded = useLoadedResourceVersion(
		`${open}:${binding?.metadata.id ?? ""}`,
		binding?.metadata.resourceVersion,
	);
	const [duplicate, setDuplicate] = useState<DuplicateAccount | null>(null);

	const { owner, usableBy, placement } = useFormOwner(
		!binding && projectId
			? { owner: { kind: "project", id: projectId } }
			: binding?.metadata,
	);
	const usablePolicies = useUsablePolicies(usableBy);
	const usableAccounts = useUsableAccounts(usableBy);

	const initial = useMemo<PolicyBindingFormValues>(
		() => (binding ? toValues(binding) : emptyValues()),
		[binding],
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

	const runValidation = zodFieldValidator<PolicyBindingFormValues>(schema);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			const displayName = value.displayName.trim();
			const description = value.description.trim();
			const labels = fromLabelPairs(value.labels);
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
							...(owner ? { owner } : {}),
						},
						spec,
					});
					toast("success", `Policy binding "${displayName}" created.`);
					onSaved(created.metadata.name);
				}
			} catch (err) {
				if (isDuplicateBinding(err)) {
					setDuplicate(
						describeDuplicate(err.body.message, (id) =>
							duplicateAccountName(accounts, id),
						),
					);
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
		form.reset(open ? initial : emptyValues());
	}, [resetKey, open, initial, form]);

	function setAccountIds(next: string[]) {
		form.setFieldValue("accountIds", next);
		setDuplicate(null);
	}

	const values = useStore(form.store, (s) => s.values);

	// The owner's usable set, plus what the binding already names so an edit keeps it.
	const usableAccountIds = new Set(usableAccounts.map((a) => a.metadata.id));
	const accountOptions = [
		...usableAccounts,
		...accounts.filter(
			(a) =>
				!usableAccountIds.has(a.metadata.id) &&
				values.accountIds.includes(a.metadata.id ?? ""),
		),
	].flatMap((a) =>
		a.metadata.id ? [{ value: a.metadata.id, label: accountLabel(a) }] : [],
	);
	const policyOptions = bindingPolicyOptions(
		usablePolicies,
		policiesData.items ?? [],
		values.policyId,
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
		placement,
		policyIdError,
		policyOptions,
		accountOptions,
		setAccountIds,
		accountIdsError: accountIdsFieldError ?? duplicate?.message,
		duplicateAccountId: duplicate?.accountId,
	};
}
