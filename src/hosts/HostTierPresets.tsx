import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { type HostPolicies, useHostPolicies } from "@/api/hooks/hosts";
import { parseDurationSeconds, windowShort } from "@/lib/timeWindow";
import { StatusInline } from "@/shared/StatusBadge";
import { Th } from "@/shared/Th";

type PresetRateLimit = NonNullable<
	NonNullable<HostPolicies["policies"]>[number]["rateLimits"]
>[number];

function formatLimits(rl: PresetRateLimit): string {
	const limits = rl.limits ?? [];
	if (limits.length === 0) return "no rules";
	return limits
		.map(
			(l) =>
				`${l.amount.toLocaleString()} ${l.meter} / ${windowShort(parseDurationSeconds(l.window))}`,
		)
		.join(" · ");
}

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
		<div className="mt-2 flex flex-col gap-2">
			<p className="text-[11px] text-muted-foreground">
				Policies this host owns. A preset applies once it is bound to an
				account.
			</p>
			<div className="rounded-md border border-border bg-card overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
						<tr>
							<Th>Preset</Th>
							<Th>Rate limits</Th>
							<Th className="text-right">Status</Th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{presets.map((p) => {
							const rateLimits = p.rateLimits ?? [];
							return (
								<tr key={p.id} className="align-top">
									<td className="px-3 py-2">
										<Link
											to="/policies/$name"
											params={{ name: p.name }}
											className="text-foreground hover:underline font-medium"
										>
											{p.name}
										</Link>
									</td>
									<td className="px-3 py-2">
										{rateLimits.length === 0 ? (
											<span className="text-xs text-muted-foreground">—</span>
										) : (
											<ul className="flex flex-col gap-1">
												{rateLimits.map((rl) => (
													<li key={rl.id} className="text-xs">
														<span className="text-foreground">{rl.name}</span>
														<span className="text-muted-foreground">
															{" "}
															· {scopeLabel(rl)} ·{" "}
														</span>
														<span className="font-mono text-[11px] text-foreground">
															{formatLimits(rl)}
														</span>
													</li>
												))}
											</ul>
										)}
									</td>
									<td className="px-3 py-2 text-right">
										<StatusInline enabled={p.enabled} />
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
