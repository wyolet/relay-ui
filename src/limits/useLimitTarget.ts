import { useQuery } from "@tanstack/react-query";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { usePolicyBindings } from "@/api/hooks/policyBindings";
import { projectDetailQueryOptions } from "@/api/hooks/projects";
import { serviceAccountDetailQueryOptions } from "@/api/hooks/serviceAccounts";
import { teamDetailQueryOptions } from "@/api/hooks/teams";
import { failureMessage } from "@/hooks/useWriteRunner";
import { displayLabel } from "@/lib/displayLabel";
import { type LimitTarget, targetScope } from "@/limits/limitWrites";
import { ownAccount } from "@/policy-bindings/accountLookup";
import { type OwnPolicyCase, ownPolicyCase } from "@/policy-bindings/ownPolicy";
import type { ShortcutTargetKind } from "@/shortcuts/registry";

export type LimitTargetState =
	| { status: "loading" }
	| { status: "notFound" }
	| { status: "failed"; message: string }
	| { status: "noAccount"; target: LimitTarget }
	| {
			status: "ready";
			target: LimitTarget;
			accountId: string;
			policyCase: OwnPolicyCase;
	  };

/** The target's row by kind; a service account also names its project. */
function useTargetRow(kind: ShortcutTargetKind | undefined, id: string) {
	const team = useQuery({
		...teamDetailQueryOptions(id),
		enabled: kind === "team" && id.length > 0,
	});
	const project = useQuery({
		...projectDetailQueryOptions(id),
		enabled: kind === "project" && id.length > 0,
	});
	const serviceAccount = useQuery({
		...serviceAccountDetailQueryOptions(id),
		enabled: kind === "serviceaccount" && id.length > 0,
	});
	if (kind === "team") return { query: team, projectId: "" };
	if (kind === "project") return { query: project, projectId: "" };
	return {
		query: serviceAccount,
		projectId: serviceAccount.data?.spec.projectId ?? "",
	};
}

/**
 * The team, project or service account a limit is for, its own account, and
 * the case of the policy that account is under.
 */
export function useLimitTarget(
	kind: ShortcutTargetKind | undefined,
	id: string,
): LimitTargetState {
	const row = useTargetRow(kind, id);
	const accounts = useQuery(accountListQueryOptions);
	const bindings = usePolicyBindings();
	const policies = useQuery(policiesListQueryOptions);

	// Rows already loaded win over a failed refetch, so the form's own writes
	// (which refetch these) never take the form away mid-run.
	const loaded = row.query.data;
	if (!kind || !id || (!loaded && row.query.isError)) {
		return { status: "notFound" };
	}
	const failed = [accounts, bindings, policies].find(
		(q) => q.data === undefined && q.isError,
	);
	if (failed) {
		return { status: "failed", message: failureMessage(failed.error) };
	}
	if (!loaded || !accounts.data || !bindings.data || !policies.data) {
		return { status: "loading" };
	}

	const targetId = loaded.metadata.id ?? id;
	const target: LimitTarget = {
		kind,
		id: targetId,
		name: loaded.metadata.name,
		label: displayLabel(loaded.metadata),
		scope: targetScope(kind, targetId, row.projectId),
	};
	const accountId = ownAccount(accounts.data.items ?? [], {
		kind,
		id: targetId,
	})?.metadata.id;
	if (!accountId) return { status: "noAccount", target };
	return {
		status: "ready",
		target,
		accountId,
		policyCase: ownPolicyCase(
			accountId,
			bindings.data.items ?? [],
			policies.data.items ?? [],
			target.scope,
		),
	};
}
