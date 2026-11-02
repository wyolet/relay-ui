import { Link } from "@tanstack/react-router";
import { Server } from "lucide-react";
import type { ModelHostView } from "@/api/hooks/models";
import type { Host } from "@/api/types/host";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel } from "@/lib/displayLabel";
import { ModelDetailTable, Td } from "@/models/ModelDetailTable";
import { EmptyState } from "@/models/ModelEmptyState";
import { StatusInline } from "@/shared/StatusBadge";

const COLUMNS = [
	{ label: "Host" },
	{ label: "Upstream" },
	{ label: "Snapshots" },
	{ label: "Adapter" },
	{ label: "Status", className: "text-right" },
];

export function ModelHostsTab({
	rows,
	hostById,
}: {
	rows: ModelHostView[];
	hostById: Map<string, Host>;
}) {
	if (rows.length === 0) {
		return (
			<EmptyState
				icon={Server}
				title="Not deployed on any host"
				body="Add this model to a host's catalog (or wait for sync) to make it callable."
			/>
		);
	}
	return (
		<ModelDetailTable columns={COLUMNS}>
			{rows.map((row) => {
				const host = hostById.get(row.host.id);
				const snapshots = row.binding.snapshots ?? [];
				return (
					<tr
						key={row.binding.id}
						className="hover:bg-muted/30 transition-colors"
					>
						<Td>
							<Link
								to="/hosts/$name"
								params={{ name: row.host.name }}
								className="block"
							>
								<HostCell
									host={host}
									size="sm"
									fallbackLabel={displayLabel(row.host)}
								/>
							</Link>
						</Td>
						<Td>
							{row.binding.upstreamName ? (
								<code className="font-mono text-[11px] text-foreground">
									{row.binding.upstreamName}
								</code>
							) : (
								<span className="text-[11px] text-muted-foreground">—</span>
							)}
						</Td>
						<Td>
							{snapshots.length > 0 ? (
								<ul className="flex flex-wrap gap-1">
									{snapshots.map((s) => (
										<li
											key={s}
											className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground"
										>
											{s}
										</li>
									))}
								</ul>
							) : (
								<span className="text-[11px] text-muted-foreground">
									All snapshots
								</span>
							)}
						</Td>
						<Td>
							<span className="text-xs text-foreground">
								{row.binding.adapter}
							</span>
						</Td>
						<Td className="text-right">
							<StatusInline enabled={row.binding.enabled} />
						</Td>
					</tr>
				);
			})}
		</ModelDetailTable>
	);
}
