import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import type { Policy } from "@/api/types/policy";
import type { components } from "@/api/types.gen";
import { Button } from "@/components/ui/button";
import { usePolicyDuplicate } from "@/policies/usePolicyDuplicate";

type EditBlockers = components["schemas"]["PolicyEditBlockers"];

/** Why a policy can't be edited here (it reaches accounts whose policy the
 * caller may not set) and the way out: duplicate it and edit the copy. */
export function PolicyInUseNotice({
	policy,
	blockers,
}: {
	policy: Policy;
	blockers: EditBlockers;
}) {
	const { duplicate, pending } = usePolicyDuplicate(policy);
	const accounts = blockers.accounts ?? [];
	return (
		<div className="grid max-w-2xl gap-5">
			<p className="text-label text-ink-2">
				Editing this policy would also change the limits of accounts whose
				policy you can't set.
			</p>
			<ul className="grid grid-cols-1">
				{accounts.map((a) => (
					<li
						key={a.id}
						className="grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-3 border-b border-rule py-2"
					>
						<span className="text-meta text-ink-3">
							{ACCOUNT_KIND_LABELS[a.kind]}
						</span>
						<Link
							to="/accounts/$name"
							params={{ name: a.name }}
							className="truncate text-label text-foreground hover:underline"
						>
							{a.displayName || a.name}
						</Link>
					</li>
				))}
				{blockers.hidden > 0 && (
					<li className="border-b border-rule py-2 text-meta text-ink-3">
						{blockers.hidden === 1
							? "1 more account you can't see"
							: `${blockers.hidden} more accounts you can't see`}
					</li>
				)}
			</ul>
			<p className="text-label text-ink-2">
				Duplicate it to get your own copy. The copy starts bound to no account:
				edit it, then attach it to the accounts you manage from their pages.
			</p>
			<div>
				<Button
					type="button"
					variant="cta"
					size="lg"
					onClick={duplicate}
					disabled={pending}
				>
					<Copy data-icon="inline-start" />
					Duplicate policy
				</Button>
			</div>
		</div>
	);
}
