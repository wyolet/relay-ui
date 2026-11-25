import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { PseudoRefusal } from "@/api/types/errors";
import type { components } from "@/api/types.gen";
import { DRY_RUN_META } from "@/pseudo/dryRunMeta";

export type AgentRemoval = components["schemas"]["AgentRemoval"];
export type AgentRemovalAnswer =
	components["schemas"]["PseudoAgentRemovalAnswer"];
export type RemovalRow = components["schemas"]["CreatedRow"];
export type RemovalKept = components["schemas"]["PseudoKept"];
type RemovalChangedBody = components["schemas"]["removalChanged"];

/** 409 `changed`: `expect` no longer matches; relay answers what it would delete and keep now. */
export class RemovalChanged extends PseudoRefusal {
	readonly deleted: RemovalRow[];
	readonly deletedHidden: number;
	readonly kept: RemovalKept[];
	readonly keptHidden: number;

	constructor(status: number, body: RemovalChangedBody) {
		super(status, body);
		this.name = "RemovalChanged";
		this.deleted = body.deleted ?? [];
		this.deletedHidden = body.deletedHidden ?? 0;
		this.kept = body.kept ?? [];
		this.keptHidden = body.keptHidden ?? 0;
	}
}

/** Both the dry run and the removal answer 200; a refusal throws a {@link PseudoRefusal}, `changed` a {@link RemovalChanged}. */
async function postAgentRemoval(
	body: AgentRemoval,
	dryRun: boolean,
): Promise<AgentRemovalAnswer> {
	const { data, error, response } = await apiClient.POST(
		"/pseudo-agent-removals",
		{ body, params: { query: dryRun ? { dryRun } : {} } },
	);
	if (error === undefined) return data;
	if (error.error.code === "changed" && "kept" in error) {
		throw new RemovalChanged(response.status, error);
	}
	throw new PseudoRefusal(response.status, error);
}

/**
 * The removal's first dry run, asked once per open: a refetch would be
 * another POST, and the dialog reruns it itself when the keep list changes.
 */
export function agentRemovalDryRunQuery(body: AgentRemoval) {
	return queryOptions({
		queryKey: ["pseudo-agent-removals", "dry-run", body.spec] as const,
		queryFn: () => postAgentRemoval(body, true),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 0,
	});
}

export function useAgentRemovalDryRun(
	body: AgentRemoval,
	{ enabled }: { enabled: boolean },
) {
	return useQuery({ ...agentRemovalDryRunQuery(body), enabled });
}

/** Deletes the agent and what was made for it in one request; a refusal deletes nothing. */
export function useRemoveAgent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: AgentRemoval) => postAgentRemoval(body, false),
		onSuccess: () => {
			for (const key of [
				["service-accounts"],
				["accounts"],
				["pools"],
				["policies"],
				["policy-bindings"],
				["keys"],
				["projects"],
			]) {
				void queryClient.invalidateQueries({ queryKey: key });
			}
		},
	});
}

/** What the removal would delete and keep, without deleting. */
export function useDryRunAgentRemoval() {
	return useMutation({
		meta: DRY_RUN_META,
		mutationFn: (body: AgentRemoval) => postAgentRemoval(body, true),
	});
}
