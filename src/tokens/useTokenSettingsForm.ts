import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import {
	type AuthTokensEnvelope,
	useUpdateAuthTokens,
} from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import {
	type DurationDraft,
	draftFromNanos,
	nanosFromDraft,
} from "@/lib/durationNanos";
import { tokenLifetimeErrors } from "@/lib/tokenLifetimes";
import { toast } from "@/shared/Toast";

interface TokenSettingsValues {
	enabled: boolean;
	defaultTTL: DurationDraft;
	maxTTL: DurationDraft;
	verifyCacheSize: number;
}

function toValues({ value }: AuthTokensEnvelope): TokenSettingsValues {
	return {
		enabled: value.enabled,
		defaultTTL: draftFromNanos(value.defaultTTL),
		maxTTL: draftFromNanos(value.maxTTL),
		verifyCacheSize: value.verifyCacheSize ?? 0,
	};
}

function validate({ value }: { value: TokenSettingsValues }) {
	const fields = tokenLifetimeErrors(value.defaultTTL, value.maxTTL);
	return fields.defaultTTL || fields.maxTTL ? { fields } : undefined;
}

function firstString(errors: readonly unknown[] | undefined) {
	for (const e of errors ?? []) if (typeof e === "string") return e;
	return undefined;
}

export function useTokenSettingsForm(envelope: AuthTokensEnvelope) {
	const update = useUpdateAuthTokens();
	const initial = toValues(envelope);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: validate, onChange: validate },
		onSubmit: async ({ value }) => {
			try {
				// PUT replaces the whole section; the signing-key refs ride along
				// unchanged, which relay accepts (only rotation may repoint them).
				await update.mutateAsync({
					...envelope.value,
					enabled: value.enabled,
					defaultTTL: nanosFromDraft(value.defaultTTL),
					maxTTL: nanosFromDraft(value.maxTTL),
					verifyCacheSize: value.verifyCacheSize,
				});
				toast("success", "Inference token settings updated.");
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError ? err.body.message : "Failed to save.",
				);
			}
		},
	});

	const values = useStore(form.store, (s) => s.values);
	// Errors wait for the first submit rather than flagging a half-typed amount.
	const errors = useStore(form.store, (s) =>
		s.submissionAttempts === 0
			? {}
			: {
					defaultTTL: firstString(s.fieldMeta.defaultTTL?.errors),
					maxTTL: firstString(s.fieldMeta.maxTTL?.errors),
				},
	);

	return {
		values,
		errors,
		saving: update.isPending,
		setEnabled: (v: boolean) => form.setFieldValue("enabled", v),
		setDefaultTTL: (v: DurationDraft) => form.setFieldValue("defaultTTL", v),
		setMaxTTL: (v: DurationDraft) => form.setFieldValue("maxTTL", v),
		setVerifyCacheSize: (v: number) => form.setFieldValue("verifyCacheSize", v),
		save: () => void form.handleSubmit(),
		reset: () => form.reset(initial),
	};
}
