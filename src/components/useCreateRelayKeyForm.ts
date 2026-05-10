import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
import { z } from "zod";
import { emptyRelayKeyDraft } from "@/components/RelayKeyForm";
import { type RelayKeyDraft, useKeysStore } from "@/stores/keys";

export const relayKeySchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(64, "Name is too long")
		.regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, digits, _ . -"),
	expiresAt: z.string().nullable(),
	rateLimit: z.unknown(),
});

export interface UseCreateRelayKeyFormOptions {
	open: boolean;
}

export function useCreateRelayKeyForm({ open }: UseCreateRelayKeyFormOptions) {
	const createKey = useKeysStore((s) => s.createKey);
	const clearSecret = useKeysStore((s) => s.clearSecret);
	const freshSecrets = useKeysStore((s) => s.freshSecrets);

	const [createdId, setCreatedId] = useState<string | null>(null);

	const form = useForm({
		defaultValues: emptyRelayKeyDraft(),
		validators: {
			onSubmit: ({ value }) => {
				const r = relayKeySchema.safeParse(value);
				if (r.success) return undefined;
				const fields: Record<string, string> = {};
				for (const issue of r.error.issues) {
					const p = issue.path[0];
					if (typeof p === "string" && !fields[p]) fields[p] = issue.message;
				}
				return { fields };
			},
		},
		onSubmit: ({ value }) => {
			const { id } = createKey(value as RelayKeyDraft);
			setCreatedId(id);
		},
	});

	// Reset state on close so reopening starts fresh.
	useEffect(() => {
		if (!open) {
			if (createdId !== null) clearSecret(createdId);
			setCreatedId(null);
			form.reset();
		}
	}, [open, createdId, clearSecret, form]);

	const values = useStore(form.store, (s) => s.values);
	const nameError = useStore(form.store, (s) => {
		const errs = s.fieldMeta?.name?.errors ?? [];
		for (const e of errs) {
			if (typeof e === "string") return e;
		}
		return undefined;
	});

	function setDraft(next: RelayKeyDraft) {
		form.setFieldValue("name", next.name);
		form.setFieldValue("expiresAt", next.expiresAt);
		form.setFieldValue("rateLimit", next.rateLimit);
	}

	return {
		form,
		values,
		nameError,
		createdId,
		secret: createdId !== null ? freshSecrets[createdId] : undefined,
		setDraft,
	};
}
