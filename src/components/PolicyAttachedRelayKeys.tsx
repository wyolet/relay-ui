import { Link } from "@tanstack/react-router";
import { KeyRound, PencilLine, Plus } from "lucide-react";
import { useRelayKeys } from "@/api/hooks/relayKeys";
import type { Policy } from "@/api/types/policy";
import { Button } from "@/components/ui/button";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

interface PolicyAttachedRelayKeysProps {
	policy: Policy;
}

export function PolicyAttachedRelayKeys({
	policy,
}: PolicyAttachedRelayKeysProps) {
	const { data } = useRelayKeys();
	const policyId = policy.metadata.id;
	const attached = (data.items ?? []).filter(
		(rk) => rk.spec.policyId === policyId,
	);

	return (
		<section className="rounded-md border border-border bg-card">
			<header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border">
				<div className="flex items-center gap-2">
					<KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
					<h2 className="text-xs font-semibold text-foreground">
						Attached relay keys
					</h2>
					<span className="text-[11px] text-muted-foreground tabular-nums">
						{attached.length}
					</span>
				</div>
				<Link to="/relay-keys/new">
					<Button type="button" variant="outline" size="sm">
						<Plus className="w-3.5 h-3.5" />
						New relay key
					</Button>
				</Link>
			</header>

			{attached.length === 0 ? (
				<p className="px-4 py-6 text-center text-xs text-muted-foreground">
					No relay keys reference this policy yet.
				</p>
			) : (
				<ul className="divide-y divide-border">
					{attached.map((rk) => {
						const enabled = rk.spec.enabled !== false;
						const revoked = Boolean(rk.spec.revokedAt);
						return (
							<li
								key={rk.metadata.name}
								className="flex items-center justify-between gap-3 px-4 py-2"
							>
								<Link
									to="/relay-keys/$name"
									params={{ name: rk.metadata.name }}
									className="min-w-0 flex-1 group focus:outline-none"
								>
									<div className="flex items-center gap-2 text-sm text-foreground group-hover:underline">
										<span className="truncate font-medium">
											{displayLabel(rk.metadata)}
										</span>
										{!enabled && (
											<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
												Disabled
											</span>
										)}
										{revoked && (
											<span className="text-[10px] uppercase tracking-wide text-destructive">
												Revoked
											</span>
										)}
									</div>
									{hasDisplayName(rk.metadata) && (
										<div className="font-mono text-[11px] text-muted-foreground truncate">
											{rk.metadata.name}
										</div>
									)}
								</Link>
								<Link
									to="/relay-keys/$name/edit"
									params={{ name: rk.metadata.name }}
								>
									<Button type="button" variant="outline" size="sm">
										<PencilLine className="w-3.5 h-3.5" />
										Reassign
									</Button>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
