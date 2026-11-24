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
import { byokWrites } from "@/byok/byokWrites";
import { useByokWrites } from "@/byok/useByokWrites";
import { stepFieldErrors, useFormSteps } from "@/hooks/useFormSteps";
import { useWorkContext } from "@/hooks/useWorkContext";
import { displayLabel } from "@/lib/displayLabel";
import {
	type OwnerPick,
	type OwnerPickKind,
	pickedScope,
} from "@/lib/ownerPick";
import { scopeOptions, type WorkContext } from "@/lib/workContext";

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
	teamId: "provider",
	projectId: "provider",
	secret: "key",
	accountName: "key",
	keyName: "key",
} as const satisfies Partial<Record<keyof ByokValues, ByokFormStep>>;

const schema = z
	.object({
		hostId: z.string().min(1, "Pick the provider the key is for."),
		ownerKind: z.enum(["personal", "team", "project", "organization"]),
		teamId: z.string(),
		projectId: z.string(),
		secret: z.string().trim().min(1, "Paste the key."),
		accountName: z.string().trim().max(120, "The account name is too long."),
		keyName: z.string().trim().max(120, "The key name is too long."),
	})
	.superRefine((v, ctx) => {
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

export function useByokForm() {
	const { userId, isAdmin } = useAuth();
	const { contexts, current } = useWorkContext();
	const writes = useByokWrites();
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

	const receivers = scope ? shareReceivers(contexts, scope) : [];
	const pickedReceivers = receivers.filter((r) =>
		values.receiverKeys.includes(receiverKey(r)),
	);

	const hostLabel = host?.label ?? "Provider";
	const accountName = values.accountName.trim() || `${hostLabel} account`;
	const keyName = values.keyName.trim() || `${hostLabel} key`;
	const planned = byokWrites({
		hostLabel,
		accountId: account?.id ?? NEW_ACCOUNT,
		accountName,
		keyName,
		tierPolicyId: values.tierPolicyId,
		receivers: pickedReceivers,
	});

	function storeKey() {
		if (!scope) return;
		void writes.start(
			{
				hostId: values.hostId,
				scope,
				secret: values.secret.trim(),
				...(account ? { account } : {}),
			},
			planned,
		);
	}
	const { step, stepIndex, lastStep, errors, next, back } = useFormSteps({
		steps: BYOK_FORM_STEPS,
		fieldStep: FIELD_STEP,
		fieldErrors: stepFieldErrors(schema, values, FIELD_STEP),
		onFinish: storeKey,
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
		if (pick.ownerKind) form.setFieldValue("ownerKind", pick.ownerKind);
		if (pick.teamId !== undefined) form.setFieldValue("teamId", pick.teamId);
		if (pick.projectId !== undefined) {
			form.setFieldValue("projectId", pick.projectId);
		}
		resetPlacement();
	}

	function toggleReceiver(key: string) {
		form.setFieldValue(
			"receiverKeys",
			values.receiverKeys.includes(key)
				? values.receiverKeys.filter((k) => k !== key)
				: [...values.receiverKeys, key],
		);
	}

	const ownerKinds: OwnerPickKind[] = isAdmin
		? ["personal", "team", "project", "organization"]
		: ["personal", "team", "project"];

	return {
		form,
		values,
		errors,
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
		newAccount: account === undefined,
		tiers,
		receivers,
		toggleReceiver,
		accountNamePlaceholder: `${hostLabel} account`,
		keyNamePlaceholder: `${hostLabel} key`,
		planned,
		writes,
	};
}
