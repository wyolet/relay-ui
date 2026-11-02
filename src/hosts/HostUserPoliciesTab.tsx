import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import type { Host } from "@/api/types/host";
import { EmptyState, Td } from "@/hosts/HostDetailKit";
import { useHostReferences } from "@/hosts/useHostReferences";
import { displayLabel } from "@/lib/displayLabel";
import { StatusInline } from "@/shared/StatusBadge";
import { Th } from "@/shared/Th";

export function HostUserPoliciesTab({ host }: { host: Host }) {
	const rows = useHostReferences(host).userPolicies;

	if (rows.length === 0) {
		return (
			<EmptyState
				icon={Users}
				title="No user policies link this host's credentials"
				body="Principals without a caller policy still reach credentials owned by their own scopes or the system. Link a pool at this host in a policy to steer traffic."
			/>
		);
	}
	return (
		<div className="mt-2 rounded-md border border-border bg-card overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						<Th>Policy</Th>
						<Th className="text-right">Credentials</Th>
						<Th className="text-right">Status</Th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{rows.map(({ policy: p, hostKeyCount }) => (
						<tr
							key={p.metadata.name}
							className="hover:bg-muted/30 transition-colors"
						>
							<Td>
								<Link
									to="/policies/$name"
									params={{ name: p.metadata.name }}
									className="text-foreground hover:underline font-medium"
								>
									{displayLabel(p.metadata)}
								</Link>
								<div className="text-[11px] text-muted-foreground font-mono truncate">
									{p.metadata.name}
								</div>
							</Td>
							<Td className="text-right tabular-nums">
								<span className="text-foreground">{hostKeyCount}</span>
							</Td>
							<Td className="text-right">
								<StatusInline enabled={p.spec.enabled !== false} />
							</Td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
