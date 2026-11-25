import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import {
	linkCountedLine,
	linkModelLines,
	savedCaseLine,
} from "@/limits/limitWrites";
import type { AddedLimit } from "@/limits/useLimitWrites";
import { TargetLink } from "@/shortcuts/TargetLink";

export function LimitAdded({ added }: { added: AddedLimit }) {
	const { target } = added;
	const quiet = buttonVariants({ variant: "outline", size: "lg" });
	const counted = linkCountedLine(added.link, target.kind, target.label);
	const models = linkModelLines(added.kind, added.link);
	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<div>
				<h2 className="text-sm font-semibold text-foreground">Limit added</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Relay applies it to {target.label} within about two seconds; requests
					sent before then aren't counted against it.
				</p>
			</div>
			<div className="flex flex-col gap-2 text-xs">
				<dl className="grid max-w-md grid-cols-[8rem_1fr] gap-x-3 gap-y-2">
					<dt className="text-muted-foreground">
						{added.kind === "budget" ? "Spend cap" : "Rate limit"}
					</dt>
					<dd className="truncate font-mono text-foreground">
						{added.limitName}
					</dd>
					{counted && (
						<>
							<dt className="text-muted-foreground">Counted</dt>
							<dd className="text-foreground">{counted}</dd>
						</>
					)}
					{models && (
						<>
							<dt className="text-muted-foreground">Models</dt>
							<dd className="flex min-w-0 flex-col gap-0.5">
								{models.map((m) => (
									<span key={m} className="truncate text-foreground">
										{m}
									</span>
								))}
							</dd>
						</>
					)}
					<dt className="text-muted-foreground">Policy</dt>
					<dd className="truncate font-mono text-foreground">
						{added.policyName}
					</dd>
				</dl>
				<p className="text-muted-foreground">
					{savedCaseLine(added.policyCase, target.label)}.
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
