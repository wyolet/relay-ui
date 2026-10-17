import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { z } from "zod";
import { type AuthSCIMEnvelope, useUpdateAuthSCIM } from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import { toast } from "@/shared/Toast";

export const LINK_CLAIMS = [
	{ value: "sub", label: "sub — the subject (Okta and most providers)" },
	{ value: "oid", label: "oid — the object id (Microsoft Entra ID)" },
] as const;

type LinkClaim = (typeof LINK_CLAIMS)[number]["value"];

const schema = z.object({
	enabled: z.boolean(),
	deleteDisables: z.boolean(),
	linkClaim: z.enum(["sub", "oid"]),
});

export type ScimSettingsValues = z.infer<typeof schema>;

function toValues({ value }: AuthSCIMEnvelope): ScimSettingsValues {
	return {
		enabled: value.enabled,
		deleteDisables: value.deleteDisables ?? false,
		linkClaim: value.linkClaim === "oid" ? "oid" : "sub",
	};
}

export function isLinkClaim(v: string | null): v is LinkClaim {
	return LINK_CLAIMS.some((c) => c.value === v);
}

export function useScimSettingsForm(envelope: AuthSCIMEnvelope) {
	const update = useUpdateAuthSCIM();
	const initial = toValues(envelope);

	const form = useForm({
		defaultValues: initial,
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			try {
				// PUT replaces the whole section: keep any field this page doesn't edit.
				await update.mutateAsync({ ...envelope.value, ...value });
				toast("success", "SCIM settings updated.");
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError ? err.body.message : "Failed to save.",
				);
			}
		},
	});

	const values = useStore(form.store, (s) => s.values);

	return {
		values,
		saving: update.isPending,
		setEnabled: (v: boolean) => form.setFieldValue("enabled", v),
		setDeleteDisables: (v: boolean) => form.setFieldValue("deleteDisables", v),
		setLinkClaim: (v: LinkClaim) => form.setFieldValue("linkClaim", v),
		save: () => void form.handleSubmit(),
		reset: () => form.reset(initial),
	};
}
