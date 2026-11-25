import { Link } from "@tanstack/react-router";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import type { Account } from "@/api/hooks/accounts";
import type { Policy } from "@/api/types/policy";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { displayLabel } from "@/lib/displayLabel";
import { AccountPolicyActions } from "@/policy-bindings/AccountPolicyActions";
import type { AttachEntity } from "@/policy-bindings/attachPolicy";
import {
	type AccountRef,
	useAccountPolicy,
} from "@/policy-bindings/useAccountPolicy";
import { DetailRow } from "@/shared/DetailCard";

export const UNBOUND = "None";

const MISSING = {
	pending: "…",
	error: "Accounts or policy bindings are not visible to you.",
	success: "No account found.",
} as const;

/** An account's name, linking to its page. */
export function AccountLink({
	account,
	className = "hover:underline",
}: {
	account: Account;
	className?: string;
}) {
	return (
		<Link
			to="/accounts/$name"
			params={{ name: account.metadata.name }}
			className={className}
		>
			{displayLabel(account.metadata)}
		</Link>
	);
}

/** The policy a binding holds: its name, or a short id when it isn't visible. */
export function BoundPolicyLink({
	binding,
	policy,
	className = "hover:underline",
}: {
	binding: PolicyBinding;
	policy: Policy | undefined;
	className?: string;
}) {
	return policy ? (
		<Link
			to="/policies/$name"
			params={{ name: policy.metadata.name }}
			className={className}
		>
			{displayLabel(policy.metadata)}
		</Link>
	) : (
		<code className="font-mono text-[11px]">
			{binding.spec.policyId.slice(0, 8)}…
		</code>
	);
}

/**
 * An account and the policy bound to it, as "Account" and "Policy" rows for a
 * detail card's <dl>. `attach` adds attach/change/detach actions for the
 * entity owning the account.
 */
export function AccountPolicy({
	accountRef,
	attach,
}: {
	accountRef: AccountRef;
	attach?: AttachEntity;
}) {
	const { status, account, binding, policy } = useAccountPolicy(accountRef);

	if (status !== "success" || !account) {
		return (
			<DetailRow label="Account">
				<span className="text-muted-foreground">{MISSING[status]}</span>
			</DetailRow>
		);
	}

	return (
		<>
			<DetailRow label="Account">
				<span className="inline-flex items-baseline gap-2">
					<AccountLink account={account} />
					<span className="text-muted-foreground">
						{ACCOUNT_KIND_LABELS[account.spec.kind]}
						{account.spec.closed && " (closed)"}
					</span>
				</span>
			</DetailRow>
			<DetailRow label="Policy">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span>
						{binding ? (
							<>
								<BoundPolicyLink binding={binding} policy={policy} />
								{binding.spec.enabled === false && (
									<span className="text-muted-foreground">
										{" "}
										(binding disabled)
									</span>
								)}
							</>
						) : (
							<span className="text-muted-foreground">{UNBOUND}</span>
						)}
					</span>
					{attach && (
						<AccountPolicyActions
							entity={attach}
							account={account}
							binding={binding}
							policyLabel={
								policy
									? displayLabel(policy.metadata)
									: (binding?.spec.policyId ?? "")
							}
						/>
					)}
				</div>
			</DetailRow>
		</>
	);
}
