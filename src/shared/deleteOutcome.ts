import type { DetachedLinks } from "@/api/types/errors";

const KIND_LABELS: Record<string, string> = {
	account: "Accounts",
	budget: "Budgets",
	"host-key": "Credentials",
	key: "API keys",
	policy: "Policies",
	"policy-binding": "Policy bindings",
	pool: "Pools",
	"rate-limit": "Rate limits",
	"service-account": "Service accounts",
};

/** Plural heading for a blocker group's kind (an API singular). */
export function blockerKindLabel(kind: string): string {
	return KIND_LABELS[kind] ?? kind;
}

function joinList(parts: readonly string[]): string {
	if (parts.length <= 1) return parts.join("");
	return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Names the policies a delete unlinked; null when it unlinked nothing. */
export function detachedSummary(
	links: readonly DetachedLinks[],
): string | null {
	const names = new Set<string>();
	let hidden = 0;
	for (const link of links) {
		for (const p of link.policies ?? []) names.add(p);
		hidden += link.hidden ?? 0;
	}
	const total = names.size + hidden;
	if (total === 0) return null;
	const parts = [...names];
	if (hidden > 0) parts.push(`${hidden} you can't see`);
	return `Unlinked from ${total === 1 ? "policy" : "policies"} ${joinList(parts)}.`;
}

/** The success toast for a delete, naming what it unlinked. */
export function deletedMessage(
	noun: string,
	label: string,
	detached: readonly DetachedLinks[],
): string {
	const head = `${noun.charAt(0).toUpperCase()}${noun.slice(1)} "${label}" deleted.`;
	const summary = detachedSummary(detached);
	return summary ? `${head} ${summary}` : head;
}
