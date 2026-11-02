import { Link } from "@tanstack/react-router";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import { displayLabel } from "@/lib/displayLabel";
import {
	type AccountRef,
	useAccountPolicy,
} from "@/policy-bindings/useAccountPolicy";
import { DetailRow } from "@/shared/DetailCard";

const UNBOUND = "No policy binding holds this account.";

const MISSING = {
	pending: "…",
	error: "Accounts or policy bindings are not visible to you.",
	success: "No account found.",
} as const;

/**
 * An account and the policy bound to it. Full mode renders "Account" and
 * "Policy" rows for a detail card's <dl>; `compact` fits a table cell.
 */
export function AccountPolicy({
	accountRef,
	compact = false,
}: {
	accountRef: AccountRef;
	compact?: boolean;
}) {
	const { status, account, binding, policy } = useAccountPolicy(accountRef);

	if (status !== "success" || !account) {
		const text = compact && status !== "pending" ? "—" : MISSING[status];
		return compact ? (
			<span className="text-muted-foreground">{text}</span>
		) : (
			<DetailRow label="Account">
				<span className="text-muted-foreground">{text}</span>
			</DetailRow>
		);
	}

	const accountLink = (
		<Link
			to="/accounts/$name"
			params={{ name: account.metadata.name }}
			className="hover:underline"
		>
			{displayLabel(account.metadata)}
		</Link>
	);
	const policyText = binding ? (
		<>
			{policy ? (
				<Link
					to="/policies/$name"
					params={{ name: policy.metadata.name }}
					className="hover:underline"
				>
					{displayLabel(policy.metadata)}
				</Link>
			) : (
				<code className="font-mono text-[11px]">
					{binding.spec.policyId.slice(0, 8)}…
				</code>
			)}
			{binding.spec.enabled === false && (
				<span className="text-muted-foreground"> (binding disabled)</span>
			)}
		</>
	) : null;

	if (compact) {
		return (
			<span className="text-foreground">
				{accountLink}
				<span className="text-muted-foreground"> · </span>
				{policyText ?? (
					<span className="text-muted-foreground" title={UNBOUND}>
						no policy
					</span>
				)}
			</span>
		);
	}

	return (
		<>
			<DetailRow label="Account">
				{accountLink}
				<span className="text-muted-foreground">
					{" "}
					· {ACCOUNT_KIND_LABELS[account.spec.kind]}
					{account.spec.closed && " (closed)"}
				</span>
			</DetailRow>
			<DetailRow label="Policy">
				{policyText ?? <span className="text-muted-foreground">{UNBOUND}</span>}
			</DetailRow>
		</>
	);
}
