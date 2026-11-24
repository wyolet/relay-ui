import { Link } from "@tanstack/react-router";
import { hiddenPoolsLine } from "@/access/accessOptions";
import type { AccessTarget } from "@/access/accessTarget";
import { TargetLink } from "@/access/TargetLink";
import type { SavedAccess } from "@/access/useSetAccessWrites";
import { buttonVariants } from "@/components/ui/button";

export function SavedStep({
	saved,
	target,
}: {
	saved: SavedAccess;
	target: AccessTarget;
}) {
	const hiddenLine = hiddenPoolsLine(saved.hiddenPoolsKept);
	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h2 className="text-sm font-semibold text-foreground">Access saved</h2>
				{saved.caseLine && (
					<p className="text-xs text-foreground">{saved.caseLine}</p>
				)}
				{hiddenLine && (
					<p className="text-xs text-muted-foreground">{hiddenLine}</p>
				)}
				<p className="text-xs text-muted-foreground">
					Requests from {target.label} follow it within a few seconds.
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
				<Link
					to="/policies/$name"
					params={{ name: saved.policyName }}
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					View policy
				</Link>
			</div>
		</div>
	);
}
