import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import {
	type IssuedScimClient,
	type ScimClient,
	useCreateScimClient,
} from "@/api/hooks/scimClients";
import { ApiError } from "@/api/types/errors";
import { scimClientNameError } from "@/lib/scim";

interface UseCreateScimClientFormOptions {
	clients: readonly ScimClient[];
	onCreated: (issued: IssuedScimClient) => void;
}

export function useCreateScimClientForm({
	clients,
	onCreated,
}: UseCreateScimClientFormOptions) {
	const create = useCreateScimClient();
	// The server is the authority on reuse (a name revoked by another session
	// isn't in our list yet); its refusal renders on the field like ours.
	const [serverError, setServerError] = useState<string | undefined>();

	function validate({ value }: { value: { name: string } }) {
		const error = scimClientNameError(value.name.trim(), clients);
		return error ? { fields: { name: error } } : undefined;
	}

	// onChange re-validates after a refusal, so a corrected name can submit.
	const form = useForm({
		defaultValues: { name: "" },
		validators: { onSubmit: validate, onChange: validate },
		onSubmit: async ({ value, formApi }) => {
			try {
				const issued = await create.mutateAsync(value.name.trim());
				create.reset();
				formApi.reset();
				onCreated(issued);
			} catch (err) {
				setServerError(
					err instanceof ApiError
						? err.body.message
						: "Failed to create the client.",
				);
			}
		},
	});

	const name = useStore(form.store, (s) => s.values.name);
	// Errors wait for the first submit rather than flagging a half-typed name.
	const fieldError = useStore(form.store, (s) => {
		if (s.submissionAttempts === 0) return undefined;
		for (const e of s.fieldMeta.name?.errors ?? []) {
			if (typeof e === "string") return e;
		}
		return undefined;
	});

	return {
		name,
		error: fieldError ?? serverError,
		submitting: create.isPending,
		setName: (v: string) => {
			setServerError(undefined);
			form.setFieldValue("name", v);
		},
		submit: () => void form.handleSubmit(),
		reset: () => {
			setServerError(undefined);
			form.reset();
		},
	};
}
