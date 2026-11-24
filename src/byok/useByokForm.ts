import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/api/auth";
import { accountListQuery } from "@/api/hooks/accounts";
import { hostPoliciesQueryOptions, useHosts } from "@/api/hooks/hosts";
import {
	ownedAccountsAt,
	receiverKey,
	shareReceivers,
} from "@/byok/byokChoices";
import type { ByokRefusal, ByokRefusalField } from "@/byok/byokRefusal";
import { byokWrites } from "@/byok/byokWrites";
import { pseudoByokBody } from "@/byok/pseudoByokBody";
import { useByokWrites } from "@/byok/useByokWrites";
import { usePseudoByokRun } from "@/byok/usePseudoByokRun";
import { stepFieldErrors, useFormSteps } from "@/hooks/useFormSteps";
import { useWorkContext } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import {
	applyOwnerPick,
	type OwnerPick,
	type OwnerPickKind,
	pickedScope,
} from "@/lib/ownerPick";
import { scopeOptions, type WorkContext } from "@/lib/workContext";
import { warnedFields, warningMessages } from "@/pseudo/dryRun";
import type { FieldIssue } from "@/pseudo/pointerField";

export const BYOK_FORM_STEPS = ["provider", "key", "sharing"] as const;
export type ByokFormStep = (typeof BYOK_FORM_STEPS)[number];

/** `accountId` of a key that gets an account of its own. */
export const NEW_ACCOUNT = "";

export interface ByokValues extends OwnerPick {
	hostId: string;
	secret: string;
	accountId: string;
	/** "" names the account and the key after the provider. */
	accountName: string;
	keyName: string;
	tierPolicyId: string;
	receiverKeys: string[];
}

const FIELD_STEP = {
	hostId: "provider",
	ownerKind: "provider",
	teamId: "provider",
	projectId: "provider",
	secret: "key",
	accountId: "key",
	accountName: "key",
	keyName: "key",
	tierPolicyId: "key",
	receiverKeys: "sharing",
} as const satisfies Partial<Record<keyof ByokValues, ByokFormStep>> &
	Record<ByokRefusalField, ByokFormStep>;

const OWNER_INPUTS = ["ownerKind", "teamId", "projectId"] as const;

/** The answers a refusal or warning of a field was about; it shows until one of them changes. */
const REFUSAL_INPUTS: Record<ByokRefusalField, readonly (keyof ByokValues)[]> =
	{
		hostId: ["hostId"],
		ownerKind: OWNER_INPUTS,
		secret: ["hostId", "secret"],
		accountId: [
			"hostId",
			...OWNER_INPUTS,
			"secret",
			"accountId",
			"accountName",
		],
		keyName: ["keyName"],
		tierPolicyId: ["hostId", "accountId", "tierPolicyId"],
		receiverKeys: [...OWNER_INPUTS, "accountId", "receiverKeys"],
	};

const schema = z
	.object({
		hostId: z.string().min(1, "Pick the provider the key is for."),
		ownerKind: z.enum(["personal", "team", "project", "organization"]),
		teamId: z.string(),
		projectId: z.string(),
		keyless: z.boolean(),
		secret: z.string(),
		accountName: z.string().trim().max(120, "The account name is too long."),
		keyName: z.string().trim().max(120, "The key name is too long."),
	})
	.superRefine((v, ctx) => {
		if (!v.keyless && !v.secret.trim()) {
			ctx.addIssue({
				code: "custom",
				path: ["secret"],
				message: "Paste the key.",
			});
		}
		if (v.ownerKind === "project" && !v.projectId) {
			ctx.addIssue({
				code: "custom",
				path: ["projectId"],
				message: "Pick the project that owns the key.",
			});
		}
		if (v.ownerKind === "team" && !v.teamId) {
			ctx.addIssue({
				code: "custom",
				path: ["teamId"],
				message: "Pick the team that owns the key.",
			});
		}
	});

/** The owner a new key starts on: the workspace. */
function initialOwnerPick(
	current: WorkContext | undefined,
	isAdmin: boolean,
): OwnerPick {
	const pick = { teamId: "", projectId: "" };
	if (current?.kind === "team") {
		return { ...pick, ownerKind: "team", teamId: current.id };
	}
	if (current?.kind === "project") {
		return { ...pick, ownerKind: "project", projectId: current.id };
	}
	if (current?.kind === "organization" && isAdmin) {
		return { ...pick, ownerKind: "organization" };
	}
	return { ...pick, ownerKind: "personal" };
}

/** An issue on a row that exists already belongs to the last step, by the list of what Store key makes. */
function issueField(issue: FieldIssue<ByokRefusalField>): ByokRefusalField {
	return issue.field ?? "receiverKeys";
}

/** The step a refused submit returns to: the earliest one holding a refused part. */
function refusalStep(refusal: ByokRefusal): ByokFormStep | undefined {
	if (refusal.kind === "general") return undefined;
	const fields =
		refusal.kind === "field" ? [refusal.field] : refusal.issues.map(issueField);
	return BYOK_FORM_STEPS.find((step) =>
		fields.some((f) => FIELD_STEP[f] === step),
	);
}

function sameAnswers(
	a: ByokValues,
	b: ByokValues,
	keys: readonly (keyof ByokValues)[],
): boolean {
	return keys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}

export function useByokForm() {
	const { userId, isAdmin } = useAuth();
	const { contexts, current } = useWorkContext();
	const writes = useByokWrites();
	const pseudo = usePseudoByokRun<ByokValues>(
		(r) =>
			contexts.find((c) => c.kind === r.kind && c.id === r.id)?.displayName ??
			r.id,
	);
	const { oneRequest, refused } = pseudo;
	const { data: hostsData } = useHosts();

	const [initial] = useState<ByokValues>(() => ({
		hostId: "",
		...initialOwnerPick(current, isAdmin),
		secret: "",
		accountId: NEW_ACCOUNT,
		accountName: "",
		keyName: "",
		tierPolicyId: "",
		receiverKeys: [],
	}));
	const form = useForm({ defaultValues: initial });
	const values = useStore(form.store, (s) => s.values);

	const hosts = (hostsData.items ?? [])
		.flatMap((host) =>
			host.metadata.id && host.spec.enabled !== false
				? [{ id: host.metadata.id, label: displayLabel(host.metadata), host }]
				: [],
		)
		.sort((a, b) => a.label.localeCompare(b.label));
	const host = hosts.find((h) => h.id === values.hostId);
	// The chain always stores a key, so only the one request leaves it out.
	const keyless = oneRequest && host?.host.spec.noAuth === true;
	const scope = pickedScope(values, userId);

	const accountsAtHost = useQuery({
		...accountListQuery({ kind: ["provider"], host_id: [values.hostId] }),
		enabled: values.hostId !== "",
	});
	const accounts =
		scope && values.hostId
			? ownedAccountsAt(
					accountsAtHost.data?.items ?? [],
					values.hostId,
					scope,
					userId,
				)
			: [];
	const account = accounts.find((a) => a.id === values.accountId);

	const tierPresets = useQuery({
		...hostPoliciesQueryOptions(host?.host.metadata.name ?? ""),
		enabled: host !== undefined,
	});
	const tiers = (tierPresets.data?.policies ?? [])
		.filter((p) => p.enabled)
		.map((p) => ({ value: p.id, label: p.name }));

	const receivers = scope && !keyless ? shareReceivers(contexts, scope) : [];
	const receiversOf = (v: ByokValues) =>
		receivers.filter((r) => v.receiverKeys.includes(receiverKey(r)));

	const hostLabel = host?.label ?? "Provider";
	const accountNameOf = (v: ByokValues) =>
		v.accountName.trim() || `${hostLabel} account`;
	const keyNameOf = (v: ByokValues) => v.keyName.trim() || `${hostLabel} key`;
	const planned = byokWrites({
		hostLabel,
		accountId: account?.id ?? NEW_ACCOUNT,
		accountName: accountNameOf(values),
		keyName: keyNameOf(values),
		tierPolicyId: values.tierPolicyId,
		receivers: receiversOf(values),
	});

	const bodyOf = (v: ByokValues) =>
		scope &&
		pseudoByokBody({
			hostId: v.hostId,
			scope,
			keyless,
			secret: v.secret.trim(),
			accountId: account?.id ?? NEW_ACCOUNT,
			accountName: accountNameOf(v),
			keyName: keyNameOf(v),
			tierPolicyId: v.tierPolicyId,
			receivers: receiversOf(v),
		});

	const answersErrors = stepFieldErrors(
		schema,
		{ ...values, keyless },
		FIELD_STEP,
	);
	const unchangedSince = (field: ByokRefusalField, at: ByokValues) =>
		sameAnswers(values, at, REFUSAL_INPUTS[field]);
	const fieldRefusal =
		refused?.refusal.kind === "field" &&
		unchangedSince(refused.refusal.field, refused.at)
			? refused.refusal
			: undefined;
	const refusedField: Partial<Record<ByokRefusalField, string>> = fieldRefusal
		? { [fieldRefusal.field]: fieldRefusal.message }
		: {};
	// organization_taken names the owner's account holding the key's organization.
	const takenAccountId =
		fieldRefusal?.field === "accountId" ? fieldRefusal.account?.id : undefined;
	const takenAccount = accounts.find((a) => a.id === takenAccountId);

	const issues: Partial<Record<ByokFormStep, string[]>> = {};
	if (refused?.refusal.kind === "issues") {
		for (const issue of refused.refusal.issues) {
			const field = issueField(issue);
			if (!unchangedSince(field, refused.at)) continue;
			// A dry run's issues show where it ran, by the list of what it would make.
			const step = refused.fromDryRun ? "sharing" : FIELD_STEP[field];
			const listed = issues[step] ?? [];
			if (!listed.includes(issue.message))
				issues[step] = [...listed, issue.message];
		}
	}
	const dryRunMessage =
		refused?.fromDryRun && refused.refusal.kind === "field"
			? refused.refusal.message
			: undefined;
	const generalMessage =
		refused?.refusal.kind === "general" ? refused.refusal.message : undefined;
	const warnedAt = pseudo.previewAt;
	// Kept out of useFormSteps' errors: a warning never holds Next or Store key.
	const warned = warnedAt
		? warnedFields(pseudo.previewWarnings, (f) => unchangedSince(f, warnedAt))
		: {};

	function previewKey(entered: ByokFormStep) {
		if (!oneRequest || entered !== "sharing") return;
		if (Object.keys(answersErrors).length > 0) return;
		const body = bodyOf(values);
		if (body) pseudo.preview(body, values);
	}

	function storeKey() {
		if (!scope) return;
		if (!oneRequest) {
			void writes.start(
				{
					hostId: values.hostId,
					scope,
					secret: values.secret.trim(),
					...(account ? { account } : {}),
				},
				planned,
			);
			return;
		}
		const body = bodyOf(values);
		if (!body) return;
		void pseudo.submit(body, values).then((refusal) => {
			const step = refusal && refusalStep(refusal);
			if (step) open(step);
		});
	}
	const { step, stepIndex, lastStep, errors, next, back, open } = useFormSteps({
		steps: BYOK_FORM_STEPS,
		fieldStep: FIELD_STEP,
		fieldErrors: { ...refusedField, ...answersErrors },
		onFinish: storeKey,
		onEnter: previewKey,
	});

	function resetPlacement() {
		form.setFieldValue("accountId", NEW_ACCOUNT);
		form.setFieldValue("receiverKeys", []);
	}

	function chooseHost(hostId: string) {
		form.setFieldValue("hostId", hostId);
		form.setFieldValue("tierPolicyId", "");
		resetPlacement();
	}

	function chooseOwner(pick: Partial<OwnerPick>) {
		applyOwnerPick(pick, form.setFieldValue);
		resetPlacement();
	}

	/** Toggles a receiver; on the open last step the dry run follows once picks settle. */
	function toggleReceiver(key: string) {
		const receiverKeys = values.receiverKeys.includes(key)
			? values.receiverKeys.filter((k) => k !== key)
			: [...values.receiverKeys, key];
		form.setFieldValue("receiverKeys", receiverKeys);
		if (!oneRequest || step !== "sharing") return;
		const picked: ByokValues = { ...values, receiverKeys };
		const body = bodyOf(picked);
		if (body) pseudo.previewSoon(body, picked);
	}

	const ownerKinds: OwnerPickKind[] = isAdmin
		? ["personal", "team", "project", "organization"]
		: ["personal", "team", "project"];
	const newAccount = account === undefined;

	return {
		form,
		values,
		errors: { ...warned, ...errors },
		step,
		stepIndex,
		lastStep,
		next,
		back,
		hosts,
		host,
		chooseHost,
		ownerKinds,
		teamOptions: scopeOptions(contexts, "team"),
		projectOptions: scopeOptions(contexts, "project"),
		chooseOwner,
		accounts,
		newAccount,
		/** The account relay says already holds the key's organization, when the owner's list has it. */
		takenAccount,
		chooseAccount: (id: string) => form.setFieldValue("accountId", id),
		tiers,
		/** The chain binds a tier only to the account it makes; the one request binds an existing one too. */
		tierOffered: tiers.length > 0 && (newAccount || oneRequest),
		/** The host takes no key: no key field, no key stored, nothing to share. */
		keyless,
		finishLabel: !keyless
			? "Store key"
			: newAccount
				? "Make account"
				: "Update account",
		receivers,
		toggleReceiver,
		accountNamePlaceholder: `${hostLabel} account`,
		keyNamePlaceholder: `${hostLabel} key`,
		oneRequest,
		planned,
		previewRows: pseudo.previewRows,
		previewLoading: pseudo.previewLoading,
		previewStale: pseudo.previewStale,
		previewWarnings: warningMessages(pseudo.previewWarnings),
		/** Why the request was refused, for the On create list: a dry run's field refusal, or one no field owns. */
		refusalMessage: dryRunMessage ?? generalMessage,
		/** Plan issues relay found on the open step; the last step lists its own by what Store key makes. */
		stepIssues: step === "sharing" ? undefined : issues[step],
		onCreateIssues: issues.sharing,
		writes: oneRequest ? pseudo.run : writes,
		stored: oneRequest ? pseudo.created : writes.stored,
	};
}
