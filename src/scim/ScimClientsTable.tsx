import { Network } from "lucide-react";
import type { ScimClient } from "@/api/hooks/scimClients";
import { fmtTs } from "@/lib/format";
import { RowMenu } from "@/shared/RowMenu";
import { StatusBadge } from "@/shared/StatusBadge";
import { Th } from "@/shared/Th";

interface ScimClientsTableProps {
	clients: readonly ScimClient[];
	busy: boolean;
	onRotate: (name: string) => void;
	onRevoke: (name: string) => void;
}

export function ScimClientsTable({
	clients,
	busy,
	onRotate,
	onRevoke,
}: ScimClientsTableProps) {
	if (clients.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
				<Network className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" />
				<p className="mb-1 text-sm font-medium text-foreground">
					No SCIM clients
				</p>
				<p className="mx-auto max-w-sm text-sm text-muted-foreground">
					Create one per identity provider and paste its token into the
					provider's provisioning settings.
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-border bg-card">
			<table className="w-full border-collapse">
				<thead className="bg-muted/40">
					<tr>
						<Th variant="column">Name</Th>
						<Th variant="column">Token</Th>
						<Th variant="column">Created</Th>
						<Th variant="column">Last used</Th>
						<Th variant="column">Status</Th>
						<Th variant="column">
							<span className="sr-only">Actions</span>
						</Th>
					</tr>
				</thead>
				<tbody>
					{clients.map((c) => (
						<tr
							key={c.name}
							className="border-t border-border transition-colors hover:bg-muted/40"
						>
							<td className="px-3 py-2 font-mono text-sm font-medium text-foreground">
								{c.name}
							</td>
							<td className="px-3 py-2 font-mono text-xs text-muted-foreground">
								{c.tokenPrefix}…
							</td>
							<td className="px-3 py-2 text-xs text-muted-foreground">
								{fmtTs(c.createdAt)}
							</td>
							<td className="px-3 py-2 text-xs text-muted-foreground">
								{c.lastUsedAt ? fmtTs(c.lastUsedAt) : "Never"}
							</td>
							<td className="px-3 py-2">
								<StatusBadge
									enabled={!c.revoked}
									enabledLabel="Active"
									disabledLabel="Revoked"
								/>
							</td>
							<td className="px-3 py-2 text-right">
								{!c.revoked && (
									<RowMenu
										actions={[
											{
												label: "Rotate token",
												disabled: busy,
												onClick: () => onRotate(c.name),
											},
											{
												label: "Revoke",
												danger: true,
												disabled: busy,
												onClick: () => onRevoke(c.name),
											},
										]}
									/>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
