import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { usePolicyRateLimits } from "@/policies/usePolicyRateLimits";

interface Props {
	policy: Policy;
}

/**
 * Rate-limit rule sets this policy references, resolved server-side via
 * `GET /policies/{ref}/rate-limits`. Each panel is one rule set with its
 * effective limits and the models it covers within this policy — no
 * client-side catalog join or overlap analysis.
 */
export function PolicyRateLimitsTab({ policy }: Props) {
	const rows = usePolicyRateLimits(policy.metadata.name);

	if (rows.length === 0) {
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
			{rows.map((row) => {
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
												{l.amount.toLocaleString()} {l.meter} / {l.window}
											</li>
										))}
									</ul>
								)}
							</div>

							<div>
								<div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
									{row.default
										? "Applies to"
										: `Models (${models.length})`}
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
