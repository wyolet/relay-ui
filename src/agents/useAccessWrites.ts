import { useQueryClient } from "@tanstack/react-query";
import type { AccessWrite } from "@/agents/accessWrites";
import {
	type AccountsListParams,
	accountListQuery,
	useShareAccount,
} from "@/api/hooks/accounts";
import { useCreatePool } from "@/api/hooks/pools";
import type { components } from "@/api/types.gen";
import { required } from "@/lib/required";
import { slugWithSuffix } from "@/lib/slug";
import {
	type AccountOwnerRef,
	ownAccount,
} from "@/policy-bindings/accountLookup";

type Owner = components["schemas"]["Owner"];
type AccountReceiver = components["schemas"]["AccountReceiver"];

/** What the access writes made so far; the policy write reads `poolIds`. */
export interface AccessProgress {
	shareIdBySource: Map<string, string>;
	poolIds: string[];
}

export function emptyAccessProgress(): AccessProgress {
	return { shareIdBySource: new Map(), poolIds: [] };
}

const ACCOUNT_POLLS = 20;
const ACCOUNT_POLL_MS = 500;

function ownAccountParams(of: AccountOwnerRef): AccountsListParams {
	return of.kind === "serviceaccount"
		? { kind: ["service"], holder_id: [of.id] }
		: { kind: [of.kind] };
}

/** Runs share and pool writes, and waits for the account relay opens for a new row. */
export function useAccessWrites() {
	const queryClient = useQueryClient();
	const shareAccount = useShareAccount();
	const createPool = useCreatePool();

	return {
		/** The id of the account relay's syncer opens shortly after a team, project or service account is made. */
		async openedAccount(of: AccountOwnerRef): Promise<string> {
			for (let poll = 0; poll < ACCOUNT_POLLS; poll++) {
				const accounts = await queryClient.fetchQuery({
					...accountListQuery(ownAccountParams(of)),
					staleTime: 0,
				});
				const id = ownAccount(accounts.items ?? [], of)?.metadata.id;
				if (id) return id;
				await new Promise((resolve) => setTimeout(resolve, ACCOUNT_POLL_MS));
			}
			throw new Error(
				"Relay hasn't opened the account yet. Retry in a moment.",
			);
		},

		async runAccessWrite(
			write: AccessWrite,
			made: AccessProgress,
			rows: {
				receiver: AccountReceiver;
				owner: Owner | undefined;
				labels?: Record<string, string>;
			},
		): Promise<void> {
			if (write.kind === "share") {
				const share = await shareAccount.mutateAsync({
					ref: write.accountId,
					receiver: rows.receiver,
				});
				made.shareIdBySource.set(
					write.accountId,
					required(share.metadata.id, "shared account"),
				);
				return;
			}
			const pool = await createPool.mutateAsync({
				metadata: {
					name: slugWithSuffix(write.displayName),
					displayName: write.displayName,
					...(rows.owner ? { owner: rows.owner } : {}),
					...(rows.labels ? { labels: rows.labels } : {}),
				},
				spec: {
					hostId: write.hostId,
					accountIds: write.accountIds.map(
						(id) => made.shareIdBySource.get(id) ?? id,
					),
				},
			});
			made.poolIds.push(required(pool.metadata.id, "pool"));
		},
	};
}
