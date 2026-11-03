import { Link } from "@tanstack/react-router";
import type { AccountRef } from "@/policy-bindings/useAccountPolicy";
import { useInheritedPolicies } from "@/policy-bindings/useInheritedPolicies";
import { DetailRow } from "@/shared/DetailCard";

/** A detail-card row naming the policies a request in the account also passes, from the accounts above it. */
export function InheritedPolicies({ accountRef }: { accountRef: AccountRef }) {
	const ladder = useInheritedPolicies(accountRef);
	if (!ladder || ladder.kind === "own") return null;

	return (
		<DetailRow
			label={ladder.kind === "also" ? "Also governed by" : "Inherited"}
		>
			{ladder.kind !== "also" && (
				<p className="text-muted-foreground">{ladder.text}</p>
			)}
			{ladder.kind !== "unlimited" && (
				<ul className="mt-1 flex flex-col gap-1 first:mt-0">
					{ladder.steps.map((step) => (
						<li key={step.key}>
							<Link
								to="/accounts/$name"
								params={{ name: step.accountName }}
								className="hover:underline"
							>
								{step.scope}
							</Link>
							<span className="text-muted-foreground"> → </span>
							<Link
								to="/policies/$name"
								params={{ name: step.policyName }}
								className="hover:underline"
							>
								{step.policyLabel}
							</Link>
						</li>
					))}
				</ul>
			)}
		</DetailRow>
	);
}
