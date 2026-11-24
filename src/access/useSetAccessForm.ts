import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useMemo, useState } from "react";
import { accessPrefill } from "@/access/accessOptions";
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
import { useSetAccessWrites } from "@/access/useSetAccessWrites";
import {
	agentAccounts,
	hostReach,
	keylessHostIds,
} from "@/agents/agentAccounts";
import { useAuth } from "@/api/auth";
import { useAccountsList } from "@/api/hooks/accounts";
import { useHosts } from "@/api/hooks/hosts";
import { usePolicies } from "@/api/hooks/policies";
import { policyBindingsAllQueryOptions } from "@/api/hooks/policyBindings";
import { usePools } from "@/api/hooks/pools";
import { useFormSteps } from "@/hooks/useFormSteps";
import { displayLabel } from "@/lib/displayLabel";
import { scopeOwner, scopeUsableBy } from "@/lib/ownerPick";
import { usePickerCatalog } from "@/models/usePickerCatalog";
import { ownPolicyCase } from "@/policy-bindings/ownPolicy";

export const ACCESS_FORM_STEPS = ["access", "review"] as const;
export type AccessFormStep = (typeof ACCESS_FORM_STEPS)[number];

export interface SetAccessValues {
	everyCredential: boolean;
	accountIds: string[];
	/** The kept pools switched on. */
	keptPoolIds: string[];
	models: string[];
}

const FIELD_STEP = { accountIds: "access" } as const satisfies Partial<
	Record<keyof SetAccessValues, AccessFormStep>
>;

/** The form that states the whole access of `target`, opened on what it has now. */
export function useSetAccessForm(target: AccessTarget) {
	const { userId } = useAuth();
	const writes = useSetAccessWrites();
	const index = usePickerCatalog();
	const { data: hosts } = useHosts();
	const { data: policies } = usePolicies();
	const { data: bindings } = useSuspenseQuery(policyBindingsAllQueryOptions);
	const { data: pools } = usePools();
	const { data: visible } = useAccountsList({ kind: ["provider"] });
	const { data: usable } = useAccountsList({
		kind: ["provider"],
		usable_by: scopeUsableBy(target.scope),
		usable_for: "pool",
	});

	const hostItems = hosts.items ?? [];
	const hostLabel = (hostId: string) => {
		const host = hostItems.find((h) => h.metadata.id === hostId);
		return host ? displayLabel(host.metadata) : hostId;
	};
	const keyless = keylessHostIds(hostItems);
	const accounts = agentAccounts(
		usable.items ?? [],
		visible.items ?? [],
		userId,
		hostLabel,
		keyless,
	);
	const policyCase = ownPolicyCase(
		target.accountId,
		bindings.items ?? [],
		policies.items ?? [],
		scopeOwner(target.scope),
	);

	// Fixed at open: the writes refetch these lists, and the form states what
	// the target had when it was opened.
	const [opened] = useState(() => ({
		policyCase,
		prefill: accessPrefill(
			policyCase.kind === "update" || policyCase.kind === "copy"
				? policyCase.policy
				: undefined,
			pools.items ?? [],
			accounts,
			hostLabel,
			keyless,
		),
	}));
	const { prefill } = opened;
	const form = useForm({
		defaultValues: {
			everyCredential: prefill.everyCredential,
			accountIds: prefill.accountIds,
			keptPoolIds: prefill.keptPools.map((p) => p.id),
			models: prefill.models,
		} satisfies SetAccessValues,
	});
	const values = useStore(form.store, (s) => s.values);

	const picked = values.accountIds.flatMap((id) =>
		accounts.filter((a) => a.id === id),
	);
	const keptPools = prefill.keptPools.filter((p) =>
		values.keptPoolIds.includes(p.id),
	);
	const reachHostNames = [
		...new Set(
			[
				...picked.map((a) => a.hostId),
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
		models: values.models,
	};
	const planned = accessPlan(
		answers,
		opened.policyCase,
		{ target: target.label, scope: target.scopeLabel },
		prefill.representedPools,
	);

	function save() {
		if (planned.length === 0) return;
		void writes.start(
			{
				target,
				policyCase: opened.policyCase,
				keptPoolIds: sentKeptPoolIds(answers),
				poolLinks: poolLinks(answers, prefill.representedPools),
				models: values.models,
			},
			planned,
		);
	}
	const { step, stepIndex, lastStep, errors, next, back } = useFormSteps({
		steps: ACCESS_FORM_STEPS,
		fieldStep: FIELD_STEP,
		fieldErrors: accessErrors(answers),
		onFinish: save,
	});

	function toggle(field: "accountIds" | "keptPoolIds", id: string) {
		const current = values[field];
		form.setFieldValue(
			field,
			current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
		);
	}

	return {
		form,
		values,
		errors,
		step,
		stepIndex,
		lastStep,
		next,
		back,
		target,
		above: opened.policyCase.kind === "above",
		currentLine: currentPolicyLine(opened.policyCase, target.label),
		accounts,
		toggleAccount: (id: string) => toggle("accountIds", id),
		keptPools: prefill.keptPools,
		toggleKeptPool: (id: string) => toggle("keptPoolIds", id),
		reach,
		planned,
		noWritesLine: noWritesLine(opened.policyCase, target.label),
		unlinksPools:
			unlinkedPoolIds(opened.policyCase, answers, prefill.representedPools)
				.length > 0,
		writes,
	};
}
