import { useQuery } from "@tanstack/react-query";
import {
	type AccessTarget,
	type AccessTargetKind,
	type AccessTargetRow,
	accessTarget,
} from "@/access/accessTarget";
import { accountListQuery } from "@/api/hooks/accounts";
import { projectDetailQueryOptions } from "@/api/hooks/projects";
import { serviceAccountDetailQueryOptions } from "@/api/hooks/serviceAccounts";
import { teamDetailQueryOptions } from "@/api/hooks/teams";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import {
	type AccountOwnerRef,
	ownAccount,
	ownAccountParams,
} from "@/policy-bindings/accountLookup";

export type AccessTargetState =
	| { status: "loading" }
	| { status: "missing" }
	/** Relay's syncer hasn't opened the row's account yet. */
	| { status: "noAccount"; label: string }
	| { status: "ready"; target: AccessTarget };

/** A missing row is a state of the page; any other failure goes to the route's error view. */
const notFoundIsState = {
	throwOnError: (err: Error) =>
		!(err instanceof ApiError && err.status === 404),
};

/** The team, project or service account named by the page's search params, with its own account. */
export function useAccessTarget(
	kind: AccessTargetKind | undefined,
	id: string | undefined,
): AccessTargetState {
	const ref = id ?? "";
	const team = useQuery({
		...teamDetailQueryOptions(ref),
		...notFoundIsState,
		enabled: kind === "team" && ref !== "",
	});
	const project = useQuery({
		...projectDetailQueryOptions(ref),
		...notFoundIsState,
		enabled: kind === "project" && ref !== "",
	});
	const serviceAccount = useQuery({
		...serviceAccountDetailQueryOptions(ref),
		...notFoundIsState,
		enabled: kind === "serviceaccount" && ref !== "",
	});
	const loaded =
		kind === "team" ? team : kind === "project" ? project : serviceAccount;
	const row: AccessTargetRow | undefined =
		kind === "serviceaccount"
			? serviceAccount.data && {
					metadata: serviceAccount.data.metadata,
					projectId: serviceAccount.data.spec.projectId,
				}
			: loaded.data && { metadata: loaded.data.metadata };

	const owner: AccountOwnerRef | undefined =
		kind && row?.metadata.id ? { kind, id: row.metadata.id } : undefined;
	const accounts = useQuery({
		...accountListQuery(ownAccountParams(owner ?? { kind: "team", id: "" })),
		enabled: owner !== undefined,
		throwOnError: true,
	});

	if (!kind || !ref || loaded.isError) return { status: "missing" };
	if (!row || !owner || !accounts.data) return { status: "loading" };
	const accountId = ownAccount(accounts.data.items ?? [], owner)?.metadata.id;
	if (!accountId) {
		return { status: "noAccount", label: displayLabel(row.metadata) };
	}
	const target = accessTarget(kind, row, accountId);
	return target ? { status: "ready", target } : { status: "missing" };
}
