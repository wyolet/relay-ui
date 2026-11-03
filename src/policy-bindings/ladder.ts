import type { AccountLimits } from "@/api/hooks/accounts";
import type { components } from "@/api/types.gen";

type LimitsAccount = components["schemas"]["LimitsAccount"];
type BoundPolicy = components["schemas"]["BoundPolicy"];

/** A rung above the account that binds a policy. */
export interface LadderStep {
	key: string;
	/** "Team Platform". */
	scope: string;
	accountName: string;
	policyName: string;
	policyLabel: string;
}

export type Ladder =
	/** Its own policy and policies above it, outermost first. */
	| { kind: "also"; steps: LadderStep[] }
	/** No policy of its own; the ones above it apply. */
	| { kind: "follows"; text: string; steps: LadderStep[] }
	| { kind: "unlimited"; text: string }
	/** Its own policy alone: nothing to add under the Policy row. */
	| { kind: "own" };

export interface LadderNames {
	scope: (account: LimitsAccount) => string;
	policy: (policy: BoundPolicy) => string;
}

/** "A's", "A's and B's", "A's, B's and C's". */
function possessives(scopes: readonly string[]): string {
	const owned = scopes.map((s) => `${s}'s`);
	if (owned.length <= 1) return owned.join("");
	return `${owned.slice(0, -1).join(", ")} and ${owned[owned.length - 1]}`;
}

/** What governs the account from above, read from its limits rungs (outermost first, the account last). */
export function toLadder(
	limits: AccountLimits,
	names: LadderNames,
	/** From the account's binding: the limits read lags a just-saved binding. */
	ownBound: boolean,
): Ladder {
	const rungs = limits.rungs ?? [];
	const steps = rungs.flatMap((r): LadderStep[] =>
		r.account.id !== limits.lane.id && r.policy
			? [
					{
						key: r.account.id,
						scope: names.scope(r.account),
						accountName: r.account.name,
						policyName: r.policy.name,
						policyLabel: names.policy(r.policy),
					},
				]
			: [],
	);
	if (ownBound)
		return steps.length > 0 ? { kind: "also", steps } : { kind: "own" };
	if (steps.length === 0) {
		return {
			kind: "unlimited",
			text: "Nothing limits it: no policy on it or above it.",
		};
	}
	// Nearest scope first: a project's policy reads before its team's.
	const nearest = [...steps].reverse().map((s) => s.scope);
	return {
		kind: "follows",
		text: `No policy of its own; follows ${possessives(nearest)}.`,
		steps,
	};
}
