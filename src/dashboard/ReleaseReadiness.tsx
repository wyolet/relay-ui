import { RELEASE_GAPS, type ReleaseGap } from "@/config/releaseGaps";
import { AlertBanner } from "@/shared/AlertBanner";

/**
 * Loud "you cannot ship this yet" tracker. Lists every mock / stub / no-op
 * still wired into the UI (sourced from RELEASE_GAPS) so they don't sneak
 * into the OSS cut. Renders nothing once the gap list is empty.
 */
export function ReleaseReadiness() {
	if (RELEASE_GAPS.length === 0) return null;

	const fe = RELEASE_GAPS.filter((g) => g.owner === "frontend").length;
	const be = RELEASE_GAPS.filter((g) => g.owner === "backend").length;

	return (
		<AlertBanner
			severity="warn"
			title={`Not shippable yet — ${RELEASE_GAPS.length} thing${
				RELEASE_GAPS.length === 1 ? "" : "s"
			} still faked`}
			body={
				<ul className="divide-y divide-amber-500/30">
					{RELEASE_GAPS.map((gap) => (
						<GapRow key={gap.id} gap={gap} />
					))}
				</ul>
			}
		>
			{fe} to wire · {be} blocked on the relay. Cut these before tagging the OSS
			release.
		</AlertBanner>
	);
}

function GapRow({ gap }: { gap: ReleaseGap }) {
	return (
		<li className="flex flex-col gap-1.5 px-3 py-3">
			<div className="flex items-center gap-2">
				<OwnerBadge owner={gap.owner} />
				<span className="text-sm font-medium text-foreground">{gap.title}</span>
			</div>
			<p className="text-xs text-muted-foreground">{gap.whatsFake}</p>
			<p className="text-xs text-foreground/80">
				<span className="font-medium">Fix:</span> {gap.fix}
			</p>
			<div className="flex flex-wrap gap-1.5">
				{gap.where.map((w) => (
					<code
						key={w}
						className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
					>
						{w}
					</code>
				))}
			</div>
		</li>
	);
}

function OwnerBadge({ owner }: { owner: ReleaseGap["owner"] }) {
	const isBackend = owner === "backend";
	return (
		<span
			className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
				isBackend
					? "bg-destructive/15 text-destructive"
					: "bg-primary/15 text-primary"
			}`}
		>
			{isBackend ? "Backend" : "Frontend"}
		</span>
	);
}
