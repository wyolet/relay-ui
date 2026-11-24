import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
	agentAccounts,
	hostReach,
	keylessHostIds,
	keylessPools,
} from "@/agents/agentAccounts";
import {
	AGENT_OWNER_KINDS,
	type AgentOwnerKind,
	type AgentOwnerPick,
	initialOwnerPick,
	ownerUnavailable,
	PERSONAL_OFF,
} from "@/agents/agentOwner";
import { agentOwnerLimits } from "@/agents/agentOwnerLimits";
import type { AgentRefusal, RefusalField } from "@/agents/agentRefusal";
import {
	type AgentAccess,
	type AgentAnswers,
	type AgentReach,
	accessErrors,
	agentWrites,
} from "@/agents/agentWrites";
import { pseudoAgentBody } from "@/agents/pseudoAgentBody";
import { type AgentSettings, useAgentWrites } from "@/agents/useAgentWrites";
import { usePseudoAgentRun } from "@/agents/usePseudoAgentRun";
import { useAuth } from "@/api/auth";
import { accountListQuery, useUsableAccounts } from "@/api/hooks/accounts";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { useUsablePolicies } from "@/api/hooks/policies";
import { useUsablePools } from "@/api/hooks/pools";
import { stepFieldErrors, useFormSteps } from "@/hooks/useFormSteps";
import { useWorkContext } from "@/hooks/useWorkContext";
import { applyOwnerPick, pickedScope, scopeUsableBy } from "@/lib/ownerPick";
import { isPersonalAccountOff } from "@/lib/personalAccount";
import { randomSuffix, slugify } from "@/lib/slug";
import { scopeOptions } from "@/lib/workContext";
import type { PickerReach } from "@/models/narrowPickerIndex";
import { usePickerCatalog } from "@/models/usePickerCatalog";
import { bindingPolicyOptions } from "@/policy-bindings/accountLookup";
import { warnedFields, warningMessages } from "@/pseudo/dryRun";
import type { FieldIssue } from "@/pseudo/pointerField";
import { sameAnswers } from "@/pseudo/refusal";

export const AGENT_FORM_STEPS = ["agent", "access", "key"] as const;
export type AgentFormStep = (typeof AGENT_FORM_STEPS)[number];

export interface AddAgentValues {
	displayName: string;
	description: string;
	ownerKind: AgentOwnerKind;
	teamId: string;
	projectId: string;
	access: AgentAccess;
	reach: AgentReach;
	accountIds: string[];
	poolIds: string[];
	models: string[];
	policyId: string;
	/** "" names the key after the agent. */
	keyName: string;
	expiresAt: string;
	passthroughAllowed: boolean;
	payloadLoggingEnabled: boolean;
}

const FIELD_STEP = {
	displayName: "agent",
	description: "agent",
	teamId: "agent",
	projectId: "agent",
	owner: "agent",
	access: "access",
	accountIds: "access",
	poolIds: "access",
	policyId: "access",
	keyName: "key",
} as const satisfies Partial<Record<keyof AddAgentValues, AgentFormStep>> &
	Record<RefusalField, AgentFormStep>;

type CheckedField = keyof typeof FIELD_STEP;

/** The answers a refusal or warning of a field was about; it shows until one of them changes. */
const REFUSAL_INPUTS: Record<RefusalField, readonly (keyof AddAgentValues)[]> =
	{
		displayName: [
			"displayName",
			"description",
			"ownerKind",
			"teamId",
			"projectId",
		],
		owner: ["ownerKind", "teamId", "projectId"],
		accountIds: ["access", "reach", "accountIds", "poolIds"],
		poolIds: ["access", "reach", "accountIds", "poolIds"],
		access: ["access", "reach", "accountIds", "poolIds", "models", "policyId"],
		policyId: ["access", "policyId"],
		keyName: [
			"keyName",
			"expiresAt",
			"passthroughAllowed",
			"payloadLoggingEnabled",
		],
	};

const schema = z
	.object({
		displayName: z
			.string()
			.trim()
			.min(1, "Name the agent.")
			.max(120, "The name is too long."),
		description: z.string().trim().max(500, "The description is too long."),
		ownerKind: z.enum(AGENT_OWNER_KINDS),
		teamId: z.string(),
		projectId: z.string(),
		access: z.enum(["choose", "policy"]),
		reach: z.enum(["all", "accounts"]),
		accountIds: z.array(z.string()),
		models: z.array(z.string()),
		policyId: z.string(),
		keyName: z.string().trim().max(120, "The key name is too long."),
	})
	.superRefine((v, ctx) => {
		const missing = (path: CheckedField, message: string) =>
			ctx.addIssue({ code: "custom", path: [path], message });
		if (v.ownerKind === "project" && !v.projectId) {
			missing("projectId", "Pick the project the agent belongs to.");
		}
		if (v.ownerKind === "team" && !v.teamId) {
			missing("teamId", "Pick the team the agent belongs to.");
		}
	});

const OWNER_UNAVAILABLE = "Pick another owner for the agent.";

const SNIPPET_MODEL_COUNT = 6;

/** Model names a first request may send: the picked single models, else what the picked accounts serve. */
function snippetModels(
	refs: readonly string[],
	reach: PickerReach | undefined,
): string[] {
	const named = refs.flatMap((ref) => ref.split("/")[1] ?? []);
	const served = [...(reach?.models.keys() ?? [])].flatMap(
		(key) => key.split("/")[1] ?? [],
	);
	return (named.length > 0 ? named : served).slice(0, SNIPPET_MODEL_COUNT);
}

/** An issue on a row that exists already belongs to the access step: what the agent may use is what changes the plans. */
function issueField(issue: FieldIssue<RefusalField>): RefusalField {
	return issue.field ?? "access";
}

/** The step a refused submit returns to: the earliest one holding a refused part. */
function refusalStep(refusal: AgentRefusal): AgentFormStep | undefined {
	if (refusal.kind === "general") return undefined;
	const fields =
		refusal.kind === "field" ? [refusal.field] : refusal.issues.map(issueField);
	return AGENT_FORM_STEPS.find((step) =>
		fields.some((f) => FIELD_STEP[f] === step),
	);
}

type KeyAnswer =
	| "keyName"
	| "expiresAt"
	| "passthroughAllowed"
	| "payloadLoggingEnabled";

function keySettings(
	v: AddAgentValues,
	agentName: string,
): AgentSettings["key"] {
	return {
		displayName: v.keyName.trim() || `${agentName} key`,
		expiresAt: v.expiresAt,
		passthroughAllowed: v.passthroughAllowed,
		payloadLoggingEnabled: v.payloadLoggingEnabled,
	};
}

export function useAddAgentForm(start?: Partial<AddAgentValues>) {
	const { userId, personalAccountEffective } = useAuth();
	const { contexts, current } = useWorkContext();
	const writes = useAgentWrites();
	const pseudo = usePseudoAgentRun<AddAgentValues>();
	const { oneRequest, refused } = pseudo;

	// Once relay refuses Personal as off, it stays off for this form.
	const personalOffRefused =
		isPersonalAccountOff(refused?.error) || writes.personalOffRefused;
	const [personalOffSeen, setPersonalOffSeen] = useState(false);
	if (personalOffRefused && !personalOffSeen) setPersonalOffSeen(true);
	const knownLimits = agentOwnerLimits(personalAccountEffective);
	const ownerLimits = {
		...knownLimits,
		personalOff:
			knownLimits.personalOff || personalOffSeen || personalOffRefused,
	};

	const [initial] = useState<AddAgentValues>(() => ({
		displayName: "",
		description: "",
		...initialOwnerPick(current, knownLimits),
		access: "choose",
		reach: "all",
		accountIds: [],
		poolIds: [],
		models: [],
		policyId: "",
		keyName: "",
		expiresAt: "",
		passthroughAllowed: false,
		payloadLoggingEnabled: false,
		...start,
	}));
	const form = useForm({ defaultValues: initial });
	const values = useStore(form.store, (s) => s.values);

	const scope = pickedScope<AgentOwnerKind>(values, userId);
	const usableBy = scope ? scopeUsableBy(scope) : undefined;
	const index = usePickerCatalog();
	const usable = useUsableAccounts(usableBy, { kind: ["provider"] }, "pool", {
		enabled: scope !== undefined,
	});
	const visible = useQuery(accountListQuery({ kind: ["provider"] }));
	const hosts = useQuery(hostsListQueryOptions);
	const usablePools = useUsablePools(
		usableBy,
		{},
		{ enabled: scope !== undefined && oneRequest },
	);
	const policies = useUsablePolicies(usableBy);
	// The last scope's rows have another owner: offering them would send picks
	// this scope can't use. Until the hosts load, keyless ones can't be told apart.
	const accountsCurrent =
		scope !== undefined && !usable.fromPreviousScope && !hosts.isPending;
	const poolsCurrent =
		oneRequest && accountsCurrent && !usablePools.fromPreviousScope;
	const policiesCurrent = !policies.fromPreviousScope;

	const keylessHosts = keylessHostIds(hosts.data?.items ?? []);
	const hostLabel = (hostId: string) =>
		index.hosts.find((h) => h.id === hostId)?.displayName ?? "";
	const accounts = accountsCurrent
		? agentAccounts(
				usable.items,
				visible.data?.items ?? [],
				userId,
				hostLabel,
				keylessHosts,
			)
		: [];
	const pools = poolsCurrent
		? keylessPools(usablePools.items, keylessHosts, hostLabel)
		: [];
	const picked = values.accountIds.flatMap((id) =>
		accounts.filter((a) => a.id === id),
	);
	const pickedPools = values.poolIds.flatMap((id) =>
		pools.filter((p) => p.id === id),
	);
	// A host tier preset describes a provider's limits; it is not an agent's policy.
	const policyOptions = policiesCurrent
		? bindingPolicyOptions(
				policies.items,
				policies.items,
				values.policyId,
			).filter((o) => !o.tierPreset)
		: [];
	const pickedHostNames = [
		...new Set(
			[...pickedPools, ...picked].flatMap(
				(a) => index.hosts.find((h) => h.id === a.hostId)?.name ?? [],
			),
		),
	]
		.sort()
		.join(",");
	const narrowsReach = values.reach === "accounts";
	// The model picker re-indexes whenever its reach changes identity.
	const reach = useMemo(
		() =>
			narrowsReach
				? hostReach(index.modelRows, pickedHostNames.split(","))
				: undefined,
		[narrowsReach, index.modelRows, pickedHostNames],
	);

	const displayName = values.displayName.trim();
	const suffix = useRef(randomSuffix());
	const slug = displayName
		? `${slugify(displayName) || "agent"}-${suffix.current}`
		: "";
	const answers: AgentAnswers = {
		displayName,
		access: values.access,
		reach: values.reach,
		accounts: picked,
		poolIds: pickedPools.map((p) => p.id),
		models: values.models,
		policyId: values.policyId,
	};
	const planned = agentWrites(answers);
	const settings: AgentSettings | undefined = scope && {
		name: slug,
		displayName,
		description: values.description.trim(),
		scope,
		key: keySettings(values, displayName),
	};

	const pickedUnavailable = ownerUnavailable(values.ownerKind, ownerLimits);
	const errorsFor = (v: AddAgentValues) => ({
		...stepFieldErrors(schema, v, FIELD_STEP),
		...accessErrors(
			answers,
			policyOptions.map((o) => o.value),
		),
		...(pickedUnavailable ? { owner: OWNER_UNAVAILABLE } : {}),
	});
	const answersErrors = errorsFor(values);
	const unchangedSince = (field: RefusalField, at: AddAgentValues) =>
		sameAnswers(values, at, REFUSAL_INPUTS[field]);
	// The Personal card says why on its own; the refusal is not a field's.
	const refusedField: Partial<Record<RefusalField, string>> =
		refused?.refusal.kind === "field" &&
		!personalOffRefused &&
		unchangedSince(refused.refusal.field, refused.at)
			? { [refused.refusal.field]: refused.refusal.message }
			: {};
	const issues: Partial<Record<AgentFormStep, string[]>> = {};
	if (refused?.refusal.kind === "issues") {
		for (const issue of refused.refusal.issues) {
			const field = issueField(issue);
			if (!unchangedSince(field, refused.at)) continue;
			// A dry run's issues show where it ran, by the list of what it would make.
			const step = refused.fromDryRun ? "key" : FIELD_STEP[field];
			const listed = issues[step] ?? [];
			if (!listed.includes(issue.message))
				issues[step] = [...listed, issue.message];
		}
	}
	const dryRunMessage =
		refused?.fromDryRun && personalOffRefused
			? PERSONAL_OFF
			: refused?.fromDryRun && refused.refusal.kind === "field"
				? refused.refusal.message
				: undefined;
	const generalMessage =
		refused?.refusal.kind === "general" ? refused.refusal.message : undefined;
	const warnedAt = pseudo.previewAt;
	// Kept out of useFormSteps' errors: a warning never holds Next or Create.
	const warned = warnedAt
		? warnedFields(pseudo.previewWarnings, (f) => unchangedSince(f, warnedAt))
		: {};

	function previewAgent(entered: AgentFormStep) {
		if (!oneRequest || entered !== "key" || !settings) return;
		if (Object.keys(answersErrors).length > 0) return;
		pseudo.preview(pseudoAgentBody(settings, answers), values);
	}

	function createAgent() {
		if (!settings) return;
		if (pickedUnavailable) {
			open("agent");
			return;
		}
		if (!oneRequest) {
			void writes.start(settings, planned);
			return;
		}
		void pseudo
			.submit(pseudoAgentBody(settings, answers), values)
			.then((refusal) => {
				const step = refusal && refusalStep(refusal);
				if (step) open(step);
			});
	}
	const { step, stepIndex, lastStep, errors, next, back, open } = useFormSteps({
		steps: AGENT_FORM_STEPS,
		fieldStep: FIELD_STEP,
		fieldErrors: { ...refusedField, ...answersErrors },
		onFinish: createAgent,
		onEnter: previewAgent,
	});

	function chooseOwner(pick: Partial<AgentOwnerPick>) {
		applyOwnerPick(pick, form.setFieldValue);
		form.setFieldValue("accountIds", []);
		form.setFieldValue("poolIds", []);
		form.setFieldValue("policyId", "");
	}

	/** Sets key answers; on the open last step the dry run follows once typing settles. */
	function setKeyAnswers(patch: Partial<Pick<AddAgentValues, KeyAnswer>>) {
		const next: AddAgentValues = { ...values, ...patch };
		if (patch.keyName !== undefined)
			form.setFieldValue("keyName", next.keyName);
		if (patch.expiresAt !== undefined) {
			form.setFieldValue("expiresAt", next.expiresAt);
		}
		if (patch.passthroughAllowed !== undefined) {
			form.setFieldValue("passthroughAllowed", next.passthroughAllowed);
		}
		if (patch.payloadLoggingEnabled !== undefined) {
			form.setFieldValue("payloadLoggingEnabled", next.payloadLoggingEnabled);
		}
		if (!oneRequest || step !== "key" || !settings) return;
		if (Object.keys(errorsFor(next)).length > 0) return;
		pseudo.previewSoon(
			pseudoAgentBody(
				{ ...settings, key: keySettings(next, displayName) },
				answers,
			),
			next,
		);
	}

	function toggle(field: "accountIds" | "poolIds", id: string) {
		const list = values[field];
		form.setFieldValue(
			field,
			list.includes(id) ? list.filter((a) => a !== id) : [...list, id],
		);
	}

	return {
		form,
		values,
		errors: { ...warned, ...errors },
		step,
		stepIndex,
		lastStep,
		next,
		back,
		ownerKinds: AGENT_OWNER_KINDS.map((kind) => ({
			kind,
			unavailable: ownerUnavailable(kind, ownerLimits),
		})),
		teamOptions: scopeOptions(contexts, "team"),
		projectOptions: scopeOptions(contexts, "project"),
		chooseOwner,
		accounts,
		accountsLoaded: accountsCurrent && usable.loaded,
		toggleAccount: (id: string) => toggle("accountIds", id),
		pools,
		togglePool: (id: string) => toggle("poolIds", id),
		reach,
		policyOptions,
		slugPreview: slug,
		snippetModels: snippetModels(values.models, reach),
		keyNamePlaceholder: displayName ? `${displayName} key` : "Agent key",
		oneRequest,
		planned,
		setKeyAnswers,
		previewRows: pseudo.previewRows,
		previewLoading: pseudo.previewLoading,
		previewStale: pseudo.previewStale,
		previewWarnings: warningMessages(pseudo.previewWarnings),
		/** Why the request was refused, for the On create list: a dry run's field refusal, or one no field owns. */
		refusalMessage: dryRunMessage ?? generalMessage,
		/** Plan issues relay found on the open step; the key step lists its own by what Create makes. */
		stepIssues: step === "key" ? undefined : issues[step],
		onCreateIssues: issues.key,
		writes: oneRequest ? pseudo.run : writes,
		created: oneRequest ? pseudo.created : writes.created,
	};
}
