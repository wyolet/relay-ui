import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { z } from "zod";
import {
	RECEIVER_KINDS,
	type ReceiverKind,
	shareReceiverError,
} from "@/accounts/sharing";
import { type Account, useShareAccount } from "@/api/hooks/accounts";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { usersListQueryOptions } from "@/api/hooks/users";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { toast } from "@/shared/Toast";

export interface ShareFormValues {
	kind: ReceiverKind;
	receiverId: string;
}

export interface ReceiverOption {
	value: string;
	label: string;
}

const schema = z.object({
	kind: z.enum(RECEIVER_KINDS),
	receiverId: z.string().min(1, "Pick who to share the account with."),
});

const DEFAULT_VALUES: ShareFormValues = { kind: "team", receiverId: "" };

/** The receivers of one kind the caller can list; each list loads only while its kind is picked. */
function useReceiverOptions(kind: ReceiverKind): ReceiverOption[] {
	const users = useQuery({
		...usersListQueryOptions,
		enabled: kind === "user",
	});
	const teams = useQuery({
		...teamsListQueryOptions,
		enabled: kind === "team",
	});
	const projects = useQuery({
		...projectsListQueryOptions,
		enabled: kind === "project",
	});
	const serviceAccounts = useQuery({
		...serviceAccountsListQueryOptions,
		enabled: kind === "serviceaccount",
	});
	const rows = {
		user: (users.data ?? []).map((u) => ({
			value: u.id,
			label: u.username || u.email || u.id,
		})),
		team: (teams.data?.items ?? []).map((t) => t.metadata),
		project: (projects.data?.items ?? []).map((p) => p.metadata),
		serviceaccount: (serviceAccounts.data?.items ?? []).map((s) => s.metadata),
	};
	if (kind === "user") return rows.user;
	return rows[kind].flatMap((m) =>
		m.id ? [{ value: m.id, label: displayLabel(m) }] : [],
	);
}

/** Shares a provider account with a user, team, project or service account. */
export function useShareAccountForm(account: Account, onShared: () => void) {
	const share = useShareAccount();
	const runValidation = zodFieldValidator<ShareFormValues>(schema);

	const form = useForm({
		defaultValues: DEFAULT_VALUES,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			try {
				const shared = await share.mutateAsync({
					ref: account.metadata.id ?? account.metadata.name,
					receiver: { kind: value.kind, id: value.receiverId },
				});
				toast(
					"success",
					`Shared "${displayLabel(account.metadata)}" as "${shared.metadata.name}".`,
				);
				onShared();
			} catch (err) {
				// A receiver refusal renders by the receiver field; anything else is a toast.
				if (shareReceiverError(err)) return;
				toast(
					"error",
					err instanceof ApiError ? err.body.message : "Failed to share.",
				);
			}
		},
	});

	const values = useStore(form.store, (s) => s.values);
	const fieldError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.receiverId, s.submissionAttempts),
	);
	const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
	const options = useReceiverOptions(values.kind);

	function setKind(kind: ReceiverKind) {
		share.reset();
		form.setFieldValue("kind", kind);
		form.setFieldValue("receiverId", "");
	}
	function setReceiver(id: string) {
		share.reset();
		form.setFieldValue("receiverId", id);
	}

	return {
		form,
		values,
		options,
		receiverError: fieldError ?? shareReceiverError(share.error),
		isSubmitting,
		setKind,
		setReceiver,
	};
}
