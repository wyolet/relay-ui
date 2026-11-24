import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { agentAccounts, hostReach } from "@/agents/agentAccounts";
import {
	AGENT_OWNER_KINDS,
	type AgentOwnerKind,
	type AgentOwnerPick,
	initialOwnerPick,
	ownerKindPlaceable,
} from "@/agents/agentOwner";
import {
	type AgentAccess,
	type AgentAnswers,
	type AgentReach,
	accessErrors,
	agentWrites,
} from "@/agents/agentWrites";
import { useAgentWrites } from "@/agents/useAgentWrites";
import { useAuth } from "@/api/auth";
import { accountListQuery, useUsableAccounts } from "@/api/hooks/accounts";
import { useUsablePolicies } from "@/api/hooks/policies";
import { stepFieldErrors, useFormSteps } from "@/hooks/useFormSteps";
import { useWorkContext } from "@/hooks/useWorkContext";
import { applyOwnerPick, pickedScope, scopeUsableBy } from "@/lib/ownerPick";
import { randomSuffix, slugify } from "@/lib/slug";
import { scopeOptions } from "@/lib/workContext";
import type { PickerReach } from "@/models/narrowPickerIndex";
import { usePickerCatalog } from "@/models/usePickerCatalog";
import { bindingPolicyOptions } from "@/policy-bindings/accountLookup";

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
	accountIds: "access",
	policyId: "access",
	keyName: "key",
} as const satisfies Partial<Record<keyof AddAgentValues, AgentFormStep>>;

type CheckedField = keyof typeof FIELD_STEP;

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

export function useAddAgentForm() {
	const { userId } = useAuth();
	const { contexts, current } = useWorkContext();
	const writes = useAgentWrites();

	const [initial] = useState<AddAgentValues>(() => ({
		displayName: "",
		description: "",
		...initialOwnerPick(current),
		access: "choose",
		reach: "all",
		accountIds: [],
		models: [],
		policyId: "",
		keyName: "",
		expiresAt: "",
		passthroughAllowed: false,
		payloadLoggingEnabled: false,
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
	const policies = useUsablePolicies(usableBy);
	// The last scope's rows have another owner: offering them would send picks
	// this scope can't use.
	const accountsCurrent = scope !== undefined && !usable.fromPreviousScope;
	const policiesCurrent = !policies.fromPreviousScope;

	const accounts = accountsCurrent
		? agentAccounts(
				usable.items,
				visible.data?.items ?? [],
				userId,
				(hostId) => index.hosts.find((h) => h.id === hostId)?.displayName ?? "",
			)
		: [];
	const picked = values.accountIds.flatMap((id) =>
		accounts.filter((a) => a.id === id),
	);
	const policyOptions = policiesCurrent
		? bindingPolicyOptions(policies.items, policies.items, values.policyId)
		: [];
	const pickedHostNames = [
		...new Set(
			picked.flatMap(
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
	const keyName = values.keyName.trim() || `${displayName} key`;
	const answers: AgentAnswers = {
		displayName,
		access: values.access,
		reach: values.reach,
		accounts: picked,
		models: values.models,
		policyId: values.policyId,
	};
	const planned = agentWrites(answers);

	function createAgent() {
		if (!scope) return;
		void writes.start(
			{
				name: slug,
				displayName,
				description: values.description.trim(),
				projectId: values.projectId,
				scope,
				key: {
					displayName: keyName,
					expiresAt: values.expiresAt,
					passthroughAllowed: values.passthroughAllowed,
					payloadLoggingEnabled: values.payloadLoggingEnabled,
				},
			},
			planned,
		);
	}
	const { step, stepIndex, lastStep, errors, next, back } = useFormSteps({
		steps: AGENT_FORM_STEPS,
		fieldStep: FIELD_STEP,
		fieldErrors: {
			...stepFieldErrors(schema, values, FIELD_STEP),
			...accessErrors(
				answers,
				policyOptions.map((o) => o.value),
			),
		},
		onFinish: createAgent,
	});

	function chooseOwner(pick: Partial<AgentOwnerPick>) {
		applyOwnerPick(pick, form.setFieldValue);
		form.setFieldValue("accountIds", []);
		form.setFieldValue("policyId", "");
	}

	function toggleAccount(id: string) {
		form.setFieldValue(
			"accountIds",
			values.accountIds.includes(id)
				? values.accountIds.filter((a) => a !== id)
				: [...values.accountIds, id],
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
		ownerKinds: AGENT_OWNER_KINDS.map((kind) => ({
			kind,
			placeable: ownerKindPlaceable(kind),
		})),
		teamOptions: scopeOptions(contexts, "team"),
		projectOptions: scopeOptions(contexts, "project"),
		chooseOwner,
		accounts,
		accountsLoaded: accountsCurrent && usable.loaded,
		toggleAccount,
		reach,
		policyOptions,
		slugPreview: slug,
		snippetModels: snippetModels(values.models, reach),
		keyNamePlaceholder: displayName ? `${displayName} key` : "Agent key",
		planned,
		writes,
	};
}
