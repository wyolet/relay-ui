import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/api/auth";
import { type Account, accountListQueryOptions } from "@/api/hooks/accounts";
import {
	policiesListQueryOptions,
	useUsablePolicies,
} from "@/api/hooks/policies";
import { usePolicyBindings } from "@/api/hooks/policyBindings";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { ownerUsableBy } from "@/lib/workContext";
import {
	bindingPolicyOptions,
	duplicateAccountName,
} from "@/policy-bindings/accountLookup";
import {
	type AttachEntity,
	attachErrorMessage,
	attachOwner,
	planAttach,
	sharedBindingNote,
} from "@/policy-bindings/attachPolicy";
import { useApplyBindingWrites } from "@/policy-bindings/useApplyBindingWrites";
import { toast } from "@/shared/Toast";

interface AttachPolicyValues {
	policyId: string;
}

const schema = z.object({
	policyId: z.string().min(1, "Pick a policy."),
});

/** Attaches a policy to the entity's account, or changes the one it has. */
export function useAttachPolicyForm({
	entity,
	account,
	binding,
	onSaved,
}: {
	entity: AttachEntity;
	account: Account;
	/** The binding holding the account now, if any. */
	binding: PolicyBinding | undefined;
	onSaved: () => void;
}) {
	const { userId } = useAuth();
	const accountId = account.metadata.id ?? "";
	const bindings = usePolicyBindings();
	const accounts = useQuery({ ...accountListQueryOptions, retry: false });
	const policies = useQuery(policiesListQueryOptions);
	const usablePolicies = useUsablePolicies(
		ownerUsableBy(attachOwner(entity, binding, accountId), userId),
	);
	const apply = useApplyBindingWrites();
	const toastSaveError = useSaveErrorToast();
	const [serverError, setServerError] = useState<string>();

	const runValidation = zodFieldValidator<AttachPolicyValues>(schema);
	const form = useForm({
		defaultValues: { policyId: binding?.spec.policyId ?? "" },
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			setServerError(undefined);
			const taken = new Set(
				(bindings.data?.items ?? []).map((b) => b.metadata.name),
			);
			const writes = planAttach(
				entity,
				accountId,
				binding,
				value.policyId,
				taken,
			);
			try {
				await apply(writes);
				if (writes.length > 0) {
					const picked = (policies.data?.items ?? []).find(
						(p) => p.metadata.id === value.policyId,
					);
					const name = picked
						? `policy "${displayLabel(picked.metadata)}"`
						: "the policy";
					toast("success", `Attached ${name} to ${entity.label}.`);
				}
				onSaved();
			} catch (err) {
				const inline = attachErrorMessage(err, (id) =>
					duplicateAccountName(accounts.data?.items ?? [], id),
				);
				if (inline) {
					setServerError(inline);
					return;
				}
				toastSaveError(err, "Failed to attach the policy.");
			}
		},
	});

	const values = useStore(form.store, (s) => s.values);
	const fieldError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.policyId, s.submissionAttempts),
	);
	const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
	const options = bindingPolicyOptions(
		usablePolicies.items,
		policies.data?.items ?? [],
		values.policyId,
	);

	function setPolicy(policyId: string) {
		setServerError(undefined);
		form.setFieldValue("policyId", policyId);
	}

	return {
		form,
		values,
		options,
		policyError: fieldError ?? serverError,
		isSubmitting,
		sharedNote: binding
			? sharedBindingNote(binding, displayLabel(binding.metadata), accountId)
			: undefined,
		setPolicy,
	};
}
