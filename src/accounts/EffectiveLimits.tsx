import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import type {
	LimitMeter,
	LimitsRungView,
	LimitsState,
} from "@/accounts/limitsView";
import { SharedLinkLabel } from "@/rate-limits/SharedLinkLabel";
import { AlertBanner } from "@/shared/AlertBanner";
import { DetailCard, DetailEmpty } from "@/shared/DetailCard";
import { ShareBar } from "@/shared/ShareBar";

const linkClass = "text-foreground hover:underline";

/** The ladder a request climbs, with usage against every rate limit and budget on it. */
export function EffectiveLimits({ state }: { state: LimitsState }) {
	if (state.status === "hidden") return null;
	return (
		<DetailCard title="Effective limits" icon={Gauge}>
			{state.status === "loading" && <DetailEmpty>Loading limits…</DetailEmpty>}
			{state.status === "ready" && (
				<div className="flex flex-col gap-3">
					{state.view.tightest && (
						<AlertBanner
							severity={state.view.tightest.exhausted ? "warn" : "info"}
							title={state.view.tightest.label}
						/>
					)}
					{state.view.rungs.length === 0 ? (
						<DetailEmpty>No caller account caps this lane.</DetailEmpty>
					) : (
						<>
							<p className="text-[11px] text-muted-foreground">
								Outermost first; every rung only narrows.
							</p>
							<ol className="flex flex-col gap-3">
								{state.view.rungs.map((rung) => (
									<Rung key={rung.key} rung={rung} />
								))}
							</ol>
						</>
					)}
				</div>
			)}
		</DetailCard>
	);
}

function Rung({ rung }: { rung: LimitsRungView }) {
	return (
		<li className="border-l-2 border-border pl-3">
			<div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
				<span className="inline-flex items-baseline gap-1.5">
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
						{rung.kindLabel}
					</span>
					<Link
						to="/accounts/$name"
						params={{ name: rung.accountName }}
						className={`font-medium ${linkClass}`}
					>
						{rung.accountName}
					</Link>
				</span>
				{rung.policy ? (
					<Link
						to="/policies/$name"
						params={{ name: rung.policy.name }}
						className={linkClass}
					>
						{rung.policy.name}
					</Link>
				) : (
					<span className="text-muted-foreground">No policy</span>
				)}
			</div>
			{rung.meters.length > 0 && (
				<ul className="mt-1.5">
					{rung.meters.map((m) => (
						<MeterRow key={m.key} meter={m} />
					))}
				</ul>
			)}
			{rung.policy && rung.meters.length === 0 && (
				<p className="mt-1 text-[11px] text-muted-foreground">
					The policy links no rate limits or budgets.
				</p>
			)}
		</li>
	);
}

function MeterRow({ meter }: { meter: LimitMeter }) {
	return (
		<li className="grid grid-cols-[minmax(0,1fr)_minmax(4rem,8rem)_auto_auto] items-center gap-3 border-b border-border py-1.5 last:border-b-0 text-xs">
			<div className="min-w-0">
				<div className="flex items-baseline gap-1.5 truncate">
					{meter.kind === "rateLimit" ? (
						<Link
							to="/policies/rate-limits/$name"
							params={{ name: meter.name }}
							className={linkClass}
						>
							{meter.name}
						</Link>
					) : (
						<Link
							to="/policies/budgets/$name"
							params={{ name: meter.name }}
							className={linkClass}
						>
							{meter.name}
						</Link>
					)}
					<span className="text-muted-foreground" title={meter.hint}>
						{meter.measure}
					</span>
					{meter.alertOnly && (
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
							Alert only
						</span>
					)}
				</div>
				{meter.models.length > 0 && (
					<div className="truncate font-mono text-[10px] text-muted-foreground">
						{meter.models.join(", ")}
					</div>
				)}
			</div>
			{meter.perLane ? (
				<span className="col-span-3 text-right text-[11px] text-muted-foreground">
					Per member: counted on each member's lane
				</span>
			) : (
				<>
					{meter.reading ? (
						<>
							<ShareBar share={meter.reading.share} lead={meter.tightest} />
							<span className="text-right tabular-nums text-foreground">
								{meter.reading.usage}
							</span>
						</>
					) : (
						<span className="col-span-2 text-right text-muted-foreground">
							—
						</span>
					)}
					<SharedLinkLabel shared={meter.shared} />
				</>
			)}
		</li>
	);
}
