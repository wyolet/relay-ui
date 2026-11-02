import { Link } from "@tanstack/react-router";
import { displayLabel } from "@/lib/displayLabel";
import type { BindingPrincipal } from "@/policy-bindings/subjects";
import { usePrincipalPolicy } from "@/policy-bindings/usePrincipalPolicy";

const UNBOUND_REACH: Record<BindingPrincipal["kind"], string> = {
	serviceaccount:
		"No policy binding names this service account, so its keys reach the host keys its project and team own, and system-owned ones.",
	user: "No system-owned or personal policy binding names this user, so their relay keys reach the host keys the user owns, and system-owned ones.",
};

/**
 * Read-only "Policy X via binding Y" for a principal. `compact` fits a table
 * cell: the unbound explanation moves into a tooltip.
 */
export function PrincipalPolicy({
	principal,
	compact = false,
}: {
	principal: BindingPrincipal;
	compact?: boolean;
}) {
	const { status, binding, policy } = usePrincipalPolicy(principal);

	if (status === "pending") {
		return <span className="text-muted-foreground">…</span>;
	}
	if (status === "error") {
		return (
			<span className="text-muted-foreground">
				{compact ? "—" : "Policy bindings are not visible to you."}
			</span>
		);
	}
	if (!binding) {
		const reach = UNBOUND_REACH[principal.kind];
		return compact ? (
			<span className="text-muted-foreground" title={reach}>
				No binding
			</span>
		) : (
			<p className="text-muted-foreground">{reach}</p>
		);
	}

	return (
		<span className="text-foreground">
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
			<span className="text-muted-foreground"> via </span>
			<Link
				to="/policy-bindings/$name"
				params={{ name: binding.metadata.name }}
				className="hover:underline"
			>
				{displayLabel(binding.metadata)}
			</Link>
			{binding.spec.enabled === false && (
				<span className="text-muted-foreground"> (binding disabled)</span>
			)}
		</span>
	);
}
