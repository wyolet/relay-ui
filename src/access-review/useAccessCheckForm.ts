import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { z } from "zod";
import {
	type AccessReviewOwnerKind,
	type AccessReviewRequest,
	type AccessReviewSubject,
	useAccessReview,
} from "@/api/hooks/accessReview";
import { accessCheckFailure } from "@/lib/accessReview";
import { shownError, zodFieldValidator } from "@/lib/formErrors";
import { RULE_KINDS, RULE_VERBS, RULE_WILDCARD } from "@/roles/vocabulary";

export const RESOURCE_KINDS = RULE_KINDS.filter((k) => k !== RULE_WILDCARD);
export const ACTION_VERBS = RULE_VERBS.filter((v) => v !== RULE_WILDCARD);
export const OWNER_KINDS: readonly AccessReviewOwnerKind[] = [
	"system",
	"user",
	"team",
	"project",
	"host",
	"provider",
];

export type AccessCheckTarget = "row" | "collection";

export interface AccessCheckFormValues {
	kind: string;
	verb: string;
	target: AccessCheckTarget;
	name: string;
	/** Empty: no owner, the list or create is asked about unrestricted. */
	ownerKind: AccessReviewOwnerKind | "";
	ownerName: string;
}

const DEFAULT_VALUES: AccessCheckFormValues = {
	kind: "keys",
	verb: "get",
	target: "row",
	name: "",
	ownerKind: "",
	ownerName: "",
};

const schema = z
	.object({
		kind: z.string().min(1),
		verb: z.string().min(1),
		target: z.enum(["row", "collection"]),
		name: z.string().trim(),
		ownerKind: z.string(),
		ownerName: z.string().trim(),
	})
	.superRefine((v, ctx) => {
		if (v.target === "row" && !v.name) {
			ctx.addIssue({
				code: "custom",
				path: ["name"],
				message: "Name the row, or ask about the collection.",
			});
		}
		if (
			v.target === "collection" &&
			v.ownerKind &&
			v.ownerKind !== "system" &&
			!v.ownerName
		) {
			ctx.addIssue({
				code: "custom",
				path: ["ownerName"],
				message: `Name the ${v.ownerKind}.`,
			});
		}
	});

function toRequest(
	v: AccessCheckFormValues,
	subject: AccessReviewSubject | undefined,
): AccessReviewRequest {
	const owner =
		v.target === "collection" && v.ownerKind
			? {
					kind: v.ownerKind,
					...(v.ownerKind === "system" ? {} : { name: v.ownerName.trim() }),
				}
			: undefined;
	return {
		action: `${v.kind}.${v.verb}`,
		resource: {
			kind: v.kind,
			...(v.target === "row" ? { name: v.name.trim() } : {}),
			...(owner ? { owner } : {}),
		},
		...(subject ? { subject } : {}),
	};
}

/** Omit `subject` to check the signed-in caller. */
export function useAccessCheckForm(subject?: AccessReviewSubject) {
	const review = useAccessReview();

	const runValidation = zodFieldValidator<AccessCheckFormValues>(schema);

	const form = useForm({
		defaultValues: DEFAULT_VALUES,
		validators: { onSubmit: runValidation, onChange: runValidation },
		onSubmit: async ({ value }) => {
			// The outcome, success or failure, renders from the mutation's state.
			await review.mutateAsync(toRequest(value, subject)).catch(() => {});
		},
	});

	const values = useStore(form.store, (s) => s.values);
	const nameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.name, s.submissionAttempts),
	);
	const ownerNameError = useStore(form.store, (s) =>
		shownError(s.fieldMeta?.ownerName, s.submissionAttempts),
	);

	return {
		form,
		values,
		nameError,
		ownerNameError,
		result: review.data,
		failure: accessCheckFailure(review.error),
		isChecking: review.isPending,
	};
}
