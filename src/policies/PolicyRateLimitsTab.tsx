import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { parseDurationSeconds, windowShort } from "@/lib/timeWindow";
import {
	type RateLimitOverlap,
	type UnthrottledModel,
	usePolicyRateLimits,
} from "@/policies/usePolicyRateLimits";
import { AlertBanner } from "@/shared/AlertBanner";

interface Props {
	policy: Policy;
}

/**
 * Rate-limit rule sets this policy references, resolved server-side via
 * `GET /policies/{ref}/rate-limits`. Each panel is one rule set with its
 * effective limits and the models it covers. The unthrottled-model and
 * overlap analyses are server-computed — no client-side catalog join.
 */
export function PolicyRateLimitsTab({ policy }: Props) {
	const { rateLimits, unthrottled, overlaps } = usePolicyRateLimits(
		policy.metadata.name,
	);

	if (rateLimits.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
				<div className="text-sm font-medium text-foreground">
					No rate limits attached
				</div>
				<div className="mt-0.5 text-xs text-muted-foreground">
					Requests through this policy are not rate-limited beyond upstream
					provider quotas.
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 pt-2">
			<OverlapBanner overlaps={overlaps} />
			<UnthrottledBanner unthrottled={unthrottled} />
			{rateLimits.map((row) => {
				const limits = row.limits ?? [];
				const models = row.models ?? [];
				return (
					<section
						key={row.id}
						className="rounded-md border border-border bg-card overflow-hidden"
					>
						<header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
							<Gauge
								className="w-3.5 h-3.5 text-muted-foreground"
								aria-hidden
							/>
							<Link
								to="/policies/rate-limits/$name"
								params={{ name: row.name }}
								className="text-sm text-foreground hover:underline truncate"
							>
								{row.name}
							</Link>
							{row.default && (
								<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-muted text-muted-foreground border border-border">
									default
								</span>
							)}
						</header>

						<div className="px-3 py-2.5 flex flex-col gap-2.5">
							<div>
								<div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
									Limits
								</div>
								{limits.length === 0 ? (
									<span className="text-[11px] text-muted-foreground">
										No rules configured.
									</span>
								) : (
									<ul className="flex flex-wrap gap-1">
										{limits.map((l) => (
											<li
												key={`${l.meter}-${l.window}-${l.amount}`}
												className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground"
												title={l.strategy}
											>
												{l.amount.toLocaleString()} {l.meter} /{" "}
												{windowShort(parseDurationSeconds(l.window))}
											</li>
										))}
									</ul>
								)}
							</div>

							<div>
								<div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
									{row.default ? "Applies to" : `Models (${models.length})`}
								</div>
								{row.default ? (
									<span className="text-[11px] text-muted-foreground">
										Every catalog ref in this policy.
									</span>
								) : models.length === 0 ? (
									<span className="text-[11px] text-muted-foreground">
										Doesn't match any current model.
									</span>
								) : (
									<ul className="flex flex-wrap gap-1">
										{models.map((m) => (
											<li
												key={m}
												className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted/60 border border-border font-mono text-[10px] text-foreground"
											>
												{m}
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</section>
				);
			})}
		</div>
	);
}

function UnthrottledBanner({
	unthrottled,
}: {
	unthrottled: UnthrottledModel[];
}) {
	if (unthrottled.length === 0) return null;
	return (
		<AlertBanner
			severity="info"
			title={`${unthrottled.length} model${unthrottled.length === 1 ? "" : "s"} pass without rate limits`}
			body={
				<ul className="flex flex-wrap gap-1 px-3 py-2">
					{unthrottled.map((u) => (
						<li
							key={u.model.id}
							className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[11px] text-foreground"
						>
							{u.model.displayName?.trim() && (
								<span>{u.model.displayName.trim()}</span>
							)}
							<code className="font-mono text-[10px] text-muted-foreground">
								{u.model.name}
							</code>
						</li>
					))}
				</ul>
			}
		>
			These models are granted by the policy but no rate-limit binding covers
			them. Requests pass without throttling — fine if intentional, otherwise
			scope a rate limit at them.
		</AlertBanner>
	);
}

function OverlapBanner({ overlaps }: { overlaps: RateLimitOverlap[] }) {
	if (overlaps.length === 0) return null;
	return (
		<AlertBanner
			severity="warn"
			title={`${overlaps.length} binding${overlaps.length === 1 ? "" : "s"} matched by more than one rate limit`}
			body={
				<ul className="divide-y divide-amber-500/20">
					{overlaps.map((o) => (
						<li
							key={`${o.provider}/${o.model}@${o.host}`}
							className="px-3 py-1.5 text-[11px]"
						>
							<code className="font-mono text-foreground">
								{o.provider}/{o.model}@{o.host}
							</code>
							<span className="text-muted-foreground">
								{" — "}
								<span className="text-foreground">{o.winner}</span> applies
								{(o.losers?.length ?? 0) > 0 && (
									<> · shadows {o.losers?.join(", ")}</>
								)}
							</span>
						</li>
					))}
				</ul>
			}
		>
			More than one attached rate limit targets the same binding. The most
			specific one wins; the others don't apply to that binding.
		</AlertBanner>
	);
}
