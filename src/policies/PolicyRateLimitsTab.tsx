import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { rateLimitRowShared } from "@/policies/policyFormSpec";
import {
	type UnthrottledModel,
	usePolicyRateLimits,
} from "@/policies/usePolicyRateLimits";
import { RateLimitRuleChips } from "@/rate-limits/RateLimitRuleChips";
import { SharedLinkLabel } from "@/rate-limits/SharedLinkLabel";
import { AlertBanner } from "@/shared/AlertBanner";
import { EmptyPanel } from "@/shared/EmptyPanel";

interface Props {
	policy: Policy;
}

/**
 * Rate limits this policy links, resolved server-side via
 * `GET /policies/{ref}/rate-limits`. Each panel is one link with its limits
 * and model scope; every linked limit applies.
 */
export function PolicyRateLimitsTab({ policy }: Props) {
	const { rateLimits, unthrottled } = usePolicyRateLimits(policy.metadata.name);

	if (rateLimits.length === 0) {
		return (
			<EmptyPanel title="No rate limits attached" className="mt-2">
				Requests through this policy are not rate-limited beyond upstream
				provider quotas.
			</EmptyPanel>
		);
	}

	return (
		<div className="flex flex-col gap-4 pt-2">
			<UnthrottledBanner unthrottled={unthrottled} />
			{rateLimits.map((row) => {
				const limits = row.limits ?? [];
				const models = row.models ?? [];
				return (
					<section
						// One rate limit may be linked again under a different model scope.
						key={`${row.id}|${models.join(",")}`}
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
									all models
								</span>
							)}
							<span className="ml-auto">
								<SharedLinkLabel
									shared={rateLimitRowShared(policy.spec.rateLimits ?? [], row)}
								/>
							</span>
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
									<RateLimitRuleChips limits={limits} />
								)}
							</div>

							<div>
								<div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
									{row.default ? "Applies to" : `Models (${models.length})`}
								</div>
								{row.default ? (
									<span className="text-[11px] text-muted-foreground">
										Every request under this policy.
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
							className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-info/10 border border-info/20 text-[11px] text-foreground"
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
			These models are granted by the policy but no linked rate limit covers
			them. Requests pass without throttling — fine if intentional, otherwise
			scope a rate limit at them.
		</AlertBanner>
	);
}
