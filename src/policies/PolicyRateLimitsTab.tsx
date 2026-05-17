import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { useRateLimits } from "@/api/hooks/ratelimits";
import type { Policy } from "@/api/types/policy";
import type { RateLimit } from "@/api/types/ratelimit";
import { displayLabel } from "@/lib/displayLabel";

interface Props {
	policy: Policy;
}

/**
 * Read-only view of the policy's rate-limit bindings. Each row pairs a
 * rate-limit row with the catalog refs it governs.
 */
export function PolicyRateLimitsTab({ policy }: Props) {
	const { data: rateLimitsData } = useRateLimits();
	const rlById = new Map<string, RateLimit>();
	for (const rl of rateLimitsData.items ?? []) {
		if (rl.metadata.id) rlById.set(rl.metadata.id, rl);
	}

	const bindings = policy.spec.rlBindings ?? [];
	const globalId = policy.spec.rateLimitId;

	if (!globalId && bindings.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
				<div className="text-sm font-medium text-foreground">
					No rate-limit bindings
				</div>
				<div className="mt-0.5 text-xs text-muted-foreground">
					Requests through this policy are not rate-limited beyond upstream
					provider quotas.
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 pt-2">
			{globalId && (
				<Row
					title="Default (all bindings)"
					rateLimit={rlById.get(globalId)}
					rateLimitId={globalId}
					scope={["*"]}
				/>
			)}
			{bindings.map((b, i) => (
				<Row
					key={`${b.rateLimitId}:${i}`}
					title={`Binding ${i + 1}`}
					rateLimit={b.rateLimitId ? rlById.get(b.rateLimitId) : undefined}
					rateLimitId={b.rateLimitId}
					scope={b.models ?? []}
				/>
			))}
		</div>
	);
}

function Row({
	title,
	rateLimit,
	rateLimitId,
	scope,
}: {
	title: string;
	rateLimit: RateLimit | undefined;
	rateLimitId: string | undefined;
	scope: readonly string[];
}) {
	return (
		<div className="rounded-md border border-border bg-card overflow-hidden">
			<div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30">
				<Gauge className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
				<div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</div>
				<div className="ml-auto text-sm">
					{rateLimit ? (
						<Link
							to="/policies/rate-limits/$name"
							params={{ name: rateLimit.metadata.name }}
							className="text-foreground hover:underline"
						>
							{displayLabel(rateLimit.metadata)}
						</Link>
					) : rateLimitId ? (
						<span className="text-destructive font-mono text-[11px]">
							missing ({rateLimitId.slice(0, 6)}…)
						</span>
					) : (
						<span className="text-muted-foreground text-[11px]">unset</span>
					)}
				</div>
			</div>
			<div className="px-3 py-2 flex flex-wrap gap-1">
				{scope.length === 0 ? (
					<span className="text-[11px] text-muted-foreground">no scope</span>
				) : (
					scope.map((s) => (
						<code
							key={s}
							className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground"
						>
							{s}
						</code>
					))
				)}
			</div>
			{rateLimit && (rateLimit.spec.rules ?? []).length > 0 && (
				<div className="px-3 py-1.5 border-t border-border text-[11px] text-muted-foreground tabular-nums flex flex-wrap gap-x-3 gap-y-1">
					{(rateLimit.spec.rules ?? []).map((rule, i) => (
						<span key={`${rule.meter}:${rule.window}:${i}`}>
							<span className="text-foreground">
								{rule.amount.toLocaleString()}
							</span>{" "}
							{rule.meter}/{rule.window}s
						</span>
					))}
				</div>
			)}
		</div>
	);
}
