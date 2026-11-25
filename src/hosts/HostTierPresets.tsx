import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { type HostPolicies, useHostPolicies } from "@/api/hooks/hosts";
import { RateLimitRuleChips } from "@/rate-limits/RateLimitRuleChips";
import { Dash, LineColumns, LineRow, QuietTag } from "@/shared/LineGrid";
import { StatusInline } from "@/shared/StatusBadge";

const COLS = "grid-cols-[minmax(10rem,1fr)_minmax(0,3fr)_5rem]";

type PresetRateLimit = NonNullable<
	NonNullable<HostPolicies["policies"]>[number]["rateLimits"]
>[number];

function scopeLabel(rl: PresetRateLimit): string {
	if (rl.default) return "all models";
	const n = rl.models?.length ?? 0;
	return `${n} model${n === 1 ? "" : "s"}`;
}

/** The host's tier presets, read-only, each with the rate limits it links. */
export function HostTierPresets({
	hostName,
	empty,
}: {
	hostName: string;
	empty: ReactNode;
}) {
	const { data } = useHostPolicies(hostName);
	const presets = data.policies ?? [];
	if (presets.length === 0) return empty;

	return (
		<div className="mt-4 grid grid-cols-1 gap-3">
			<p className="text-meta text-ink-3">
				Policies this host owns. A preset applies once it is bound to an
				account.
			</p>
			<div className="grid grid-cols-1">
				<LineColumns cols={COLS}>
					<span>Preset</span>
					<span>Rate limits</span>
					<span className="text-right">Status</span>
				</LineColumns>
				{presets.map((p) => {
					const rateLimits = p.rateLimits ?? [];
					return (
						<LineRow key={p.id} cols={COLS} className="items-start">
							<Link
								to="/policies/$name"
								params={{ name: p.name }}
								className="truncate font-medium text-foreground hover:underline"
							>
								{p.name}
							</Link>
							{rateLimits.length === 0 ? (
								<Dash />
							) : (
								<ul className="grid grid-cols-1 gap-1">
									{rateLimits.map((rl) => (
										<li
											key={rl.id}
											className="flex flex-wrap items-center gap-x-2 gap-y-1"
										>
											<span className="text-foreground">{rl.name}</span>
											<QuietTag>{scopeLabel(rl)}</QuietTag>
											{rl.limits?.length ? (
												<RateLimitRuleChips limits={rl.limits} />
											) : (
												<QuietTag>no rules</QuietTag>
											)}
										</li>
									))}
								</ul>
							)}
							<span className="text-right">
								<StatusInline enabled={p.enabled} />
							</span>
						</LineRow>
					);
				})}
			</div>
		</div>
	);
}
