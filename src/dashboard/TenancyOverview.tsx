import { Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { Suspense } from "react";
import { useDeniedAuditCount } from "@/api/hooks/audit";
import { resolveWindow, rolling24hWindow } from "@/api/hooks/usage";
import { PageLoader } from "@/shared/Spinner";
import { fmtCompact } from "@/usage/format";
import { UsageTopGroups } from "@/usage/UsageTopGroups";

/**
 * The tenancy slice of the admin home: where the month's spend is going by
 * team, and how much the authorizer turned away. Top models, key/breaker
 * health, and fleet traffic already have their own blocks on this page.
 */
export function TenancyOverview() {
	const period = resolveWindow("month");
	return (
		<section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
			<Suspense fallback={<Loading />}>
				<UsageTopGroups groupBy="team_id" win={period} limit={6} />
			</Suspense>
			<DeniedRequestsCard />
		</section>
	);
}

/** Denials over the trailing 24h — the one number that says whether RBAC is
 * biting. Hidden entirely when the audit log is unreadable or unwritten. */
function DeniedRequestsCard() {
	const from = rolling24hWindow().from;
	const denied = useDeniedAuditCount(from);
	if (!denied) return null;

	return (
		<div className="rounded-lg border border-border bg-card">
			<div className="flex items-center justify-between border-b border-border px-4 py-2.5">
				<h2 className="text-sm font-medium text-foreground">Denied requests</h2>
				<span className="text-[11px] text-muted-foreground">last 24h</span>
			</div>
			<div className="flex items-center gap-3 px-4 py-4">
				<ShieldX
					className={
						denied.events > 0
							? "size-5 text-destructive"
							: "size-5 text-muted-foreground"
					}
					aria-hidden
				/>
				<span className="text-2xl font-semibold tabular-nums text-foreground">
					{fmtCompact(denied.events)}
					{denied.truncated && "+"}
				</span>
			</div>
			<Link
				to="/audit"
				search={{ span: "24h", outcome: "denied" }}
				className="flex items-center justify-end border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
			>
				Inspect denials →
			</Link>
		</div>
	);
}

function Loading() {
	return (
		<div className="rounded-lg border border-border bg-card">
			<PageLoader />
		</div>
	);
}
