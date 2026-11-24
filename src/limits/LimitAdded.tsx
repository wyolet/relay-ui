import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { TargetLink } from "@/limits/TargetLink";
import type { AddedLimit } from "@/limits/useLimitWrites";

export function LimitAdded({ added }: { added: AddedLimit }) {
	const { target } = added;
	const quiet = buttonVariants({ variant: "outline", size: "lg" });
	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<div>
				<h2 className="text-sm font-semibold text-foreground">Limit added</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Relay applies it to {target.label} within about two seconds; requests
					sent before then aren't counted against it.
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<TargetLink
					kind={target.kind}
					name={target.name}
					className={buttonVariants({ variant: "cta", size: "lg" })}
				>
					Back to {target.label}
				</TargetLink>
				{added.kind === "budget" ? (
					<Link
						to="/policies/budgets/$name"
						params={{ name: added.limitName }}
						className={quiet}
					>
						View spend cap
					</Link>
				) : (
					<Link
						to="/policies/rate-limits/$name"
						params={{ name: added.limitName }}
						className={quiet}
					>
						View rate limit
					</Link>
				)}
				<Link
					to="/policies/$name"
					params={{ name: added.policyName }}
					className={quiet}
				>
					View policy
				</Link>
			</div>
		</div>
	);
}
