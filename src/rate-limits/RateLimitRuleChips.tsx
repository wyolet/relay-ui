import type { components } from "@/api/types.gen";
import { parseDurationSeconds, windowShort } from "@/lib/timeWindow";

type Limit = components["schemas"]["Limit"];

/** A linked rate limit's rules as chips; the strategy shows on hover. */
export function RateLimitRuleChips({ limits }: { limits: readonly Limit[] }) {
	return (
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
	);
}
