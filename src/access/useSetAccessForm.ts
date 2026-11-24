import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useMemo, useState } from "react";
import { hiddenPoolsLine } from "@/access/accessOptions";
import {
	type AccessAnswers,
	accessErrors,
	accessPlan,
	currentPolicyLine,
	noWritesLine,
	poolLinks,
	sentKeptPoolIds,
	unlinkedPoolIds,
} from "@/access/accessPlan";
import type { AccessTarget } from "@/access/accessTarget";
import {
	type AccessRefusal,
	type AccessRefusalField,
	pseudoAccessBody,
	pseudoCurrentLine,
	sentPoolIds,
	writesNothing,
} from "@/access/pseudoAccessBody";
import type { AccessOffers, OpenedAccess } from "@/access/useAccessOpening";
import { usePseudoAccessRun } from "@/access/usePseudoAccessRun";
import { useSetAccessWrites } from "@/access/useSetAccessWrites";
import { hostReach } from "@/agents/agentAccounts";
import { useFormSteps } from "@/hooks/useFormSteps";
import { usePickerCatalog } from "@/models/usePickerCatalog";
import { warnedFields, warningMessages } from "@/pseudo/dryRun";
import { sameAnswers } from "@/pseudo/refusal";
import { useUnderConfirm } from "@/pseudo/useUnderConfirm";

export const ACCESS_FORM_STEPS = ["access", "review"] as const;
export type AccessFormStep = (typeof ACCESS_FORM_STEPS)[number];

export interface SetAccessValues {
	everyCredential: boolean;
	accountIds: string[];
	/** The kept pools switched on. */
	keptPoolIds: string[];
	/** The keyless-host pools picked; the one-request path only. */
	poolIds: string[];
	models: string[];
}

const FIELD_STEP = {
	everyCredential: "access",
	accountIds: "access",
	poolIds: "access",
	access: "access",
} as const satisfies Record<AccessRefusalField, AccessFormStep>;

/** The answers a refusal or warning was about: all of them, since the body states the whole access. */
const ACCESS_INPUTS = [
	"everyCredential",
	"accountIds",
	"keptPoolIds",
	"poolIds",
	"models",
] as const satisfies readonly (keyof SetAccessValues)[];

/** The case as the chain's plan names it, for the lines both paths share. */
const CHAIN_KIND = { none: "create", own: "update", copy: "copy" } as const;

/** The form that states the whole access of `target`, opened on what it has now. */
export function useSetAccessForm(
	target: AccessTarget,
	offers: AccessOffers,
	openedNow: OpenedAccess,
) {
	const chainWrites = useSetAccessWrites();
	const pseudo = usePseudoAccessRun<SetAccessValues>(target.label);
	const index = usePickerCatalog();
	const { accounts, pools } = offers;

	// Fixed at open: the writes refetch what it was read from, and the form
	// states what the target had when it was opened.
	const [opened] = useState(openedNow);
	const oneRequest = opened.path === "oneRequest";
	const { prefill } = opened;
	const form = useForm({
		defaultValues: {
			everyCredential: prefill.everyCredential,
			accountIds: prefill.accountIds,
			keptPoolIds: prefill.keptPools.map((p) => p.id),
			poolIds: opened.path === "oneRequest" ? opened.prefill.poolIds : [],
			models: prefill.models,
		} satisfies SetAccessValues,
	});
	const values = useStore(form.store, (s) => s.values);

	const picked = values.accountIds.flatMap((id) =>
		accounts.filter((a) => a.id === id),
	);
	const pickedPools = values.poolIds.flatMap((id) =>
		pools.filter((p) => p.id === id),
	);
	const keptPools = prefill.keptPools.filter((p) =>
		values.keptPoolIds.includes(p.id),
	);
	const reachHostNames = [
		...new Set(
			[
				...picked.map((a) => a.hostId),
				...pickedPools.map((p) => p.hostId),
				...keptPools.flatMap((p) => p.hostId ?? []),
			].flatMap((id) => index.hosts.find((h) => h.id === id)?.name ?? []),
		),
	]
		.sort()
		.join(",");
	// The model picker re-indexes whenever its reach changes identity.
	const reach = useMemo(
		() =>
			values.everyCredential
				? undefined
				: hostReach(index.modelRows, reachHostNames.split(",")),
		[values.everyCredential, index.modelRows, reachHostNames],
	);

	const answers: AccessAnswers = {
		everyCredential: values.everyCredential,
		accounts: picked,
		keptPoolIds: keptPools.map((p) => p.id),
		poolIds: pickedPools.map((p) => p.id),
		models: values.models,
	};
	const planned =
		opened.path === "chain"
			? accessPlan(
					answers,
					opened.policyCase,
					{ target: target.label, scope: target.scopeLabel },
					prefill.representedPools,
				)
			: [];
	const body = pseudoAccessBody(target, {
		everyCredential: values.everyCredential,
		poolIds: sentPoolIds(
			values.everyCredential,
			opened.path === "oneRequest" ? opened.prefill.currentPoolIds : [],
			[...answers.keptPoolIds, ...(answers.poolIds ?? [])],
		),
		accountIds: picked.map((a) => a.id),
		models: values.models,
	});

	const { refused } = pseudo;
	const unchangedSince = (at: SetAccessValues) =>
		sameAnswers(values, at, ACCESS_INPUTS);
	const refusedField: Partial<Record<AccessRefusalField, string>> =
		refused?.refusal.kind === "field" && unchangedSince(refused.at)
			? { [refused.refusal.field]: refused.refusal.message }
			: {};
	const issueMessages =
		refused?.refusal.kind === "issues" && unchangedSince(refused.at)
			? [...new Set(refused.refusal.issues.map((i) => i.message))]
			: undefined;
	const dryRunMessage =
		refused?.fromDryRun && refused.refusal.kind === "field"
			? refused.refusal.message
			: undefined;
	const generalMessage =
		refused?.refusal.kind === "general" ? refused.refusal.message : undefined;
	const warnedAt = pseudo.previewAt;
	// Kept out of useFormSteps' errors: a warning never holds Next or Save.
	const warned = warnedAt
		? warnedFields(pseudo.previewWarnings, () => unchangedSince(warnedAt))
		: {};
	const previewAnswer = pseudo.previewAnswer;
	const under = useUnderConfirm(
		previewAnswer,
		pseudo.previewLoading || pseudo.previewStale,
	);
	const nothingChanged = oneRequest
		? previewAnswer !== undefined &&
			!pseudo.previewStale &&
			writesNothing(previewAnswer)
		: planned.length === 0;

	function previewAccess(entered: AccessFormStep) {
		if (oneRequest && entered === "review") pseudo.preview(body, values);
	}

	function save() {
		if (!oneRequest) {
			if (planned.length === 0 || opened.path !== "chain") return;
			void chainWrites.start(
				{
					target,
					policyCase: opened.policyCase,
					keptPoolIds: sentKeptPoolIds(answers),
					poolLinks: poolLinks(answers, prefill.representedPools),
					models: values.models,
				},
				planned,
			);
			return;
		}
		void pseudo.submit(body, values).then((refusal: AccessRefusal | null) => {
			if (refusal?.kind === "field") open(FIELD_STEP[refusal.field]);
		});
	}
	const { step, stepIndex, lastStep, errors, next, back, open } = useFormSteps({
		steps: ACCESS_FORM_STEPS,
		fieldStep: FIELD_STEP,
		fieldErrors: { ...refusedField, ...accessErrors(answers) },
		onFinish: save,
		onEnter: previewAccess,
	});

	function toggle(field: "accountIds" | "keptPoolIds" | "poolIds", id: string) {
		const current = values[field];
		form.setFieldValue(
			field,
			current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
		);
	}

	const chainCase =
		opened.path === "chain"
			? opened.policyCase
			: { kind: CHAIN_KIND[opened.accessCase] };
	return {
		form,
		values,
		errors: { ...warned, ...errors },
		step,
		stepIndex,
		lastStep,
		next,
		back,
		target,
		oneRequest,
		currentLine:
			opened.path === "chain"
				? currentPolicyLine(opened.policyCase, target.label)
				: pseudoCurrentLine(opened.accessCase, opened.policyName, target.label),
		bindingOffLine:
			opened.path === "oneRequest" ? opened.bindingOffLine : undefined,
		hiddenPoolsLine:
			opened.path === "oneRequest"
				? hiddenPoolsLine(opened.prefill.hiddenPools)
				: undefined,
		accounts,
		toggleAccount: (id: string) => toggle("accountIds", id),
		keptPools: prefill.keptPools,
		toggleKeptPool: (id: string) => toggle("keptPoolIds", id),
		pools,
		togglePool: (id: string) => toggle("poolIds", id),
		reach,
		planned,
		nothingChanged,
		/** Nothing would change, the dry run hasn't answered, or accounts that stop working aren't confirmed. */
		finishDisabled: nothingChanged || (oneRequest && under.blocksSave),
		under,
		noWritesLine: noWritesLine(chainCase, target.label),
		unlinksPools:
			opened.path === "chain" &&
			unlinkedPoolIds(opened.policyCase, answers, prefill.representedPools)
				.length > 0,
		previewRows: pseudo.previewRows,
		previewLoading: pseudo.previewLoading,
		previewStale: pseudo.previewStale,
		previewWarnings: warningMessages(pseudo.previewWarnings),
		/** Why relay refused, for the review step: a dry run's field refusal, or one no field owns. */
		refusalMessage: dryRunMessage ?? generalMessage,
		issueMessages,
		writes: oneRequest ? pseudo.run : chainWrites,
		saved: oneRequest ? pseudo.created : chainWrites.saved,
	};
}
