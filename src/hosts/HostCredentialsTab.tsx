import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import type { Host } from "@/api/types/host";
import { useHostCredentials } from "@/hosts/useHostCredentials";
import { displayLabel } from "@/lib/displayLabel";
import { DetailTable, Td } from "@/shared/DetailTable";
import { EmptyState } from "@/shared/EmptyState";
import { StatusInline } from "@/shared/StatusBadge";

const COLUMNS = [
	{ label: "Name" },
	{ label: "Source" },
	{ label: "Account" },
	{ label: "Used by", className: "text-right" },
	{ label: "Status", className: "text-right" },
];

export function HostCredentialsTab({ host }: { host: Host }) {
	const rows = useHostCredentials(host);

	if (rows.length === 0) {
		return (
			<EmptyState
				icon={KeyRound}
				title="No credentials yet"
				body="Register an upstream credential to make this host live."
			/>
		);
	}

	return (
		<DetailTable columns={COLUMNS}>
			{rows.map(({ hostKey: hk, account }) => {
				const used = hk.policies?.length ?? 0;
				return (
					<tr
						key={hk.metadata.name}
						className="hover:bg-muted/30 transition-colors"
					>
						<Td>
							<Link
								to="/host-keys/$name"
								params={{ name: hk.metadata.name }}
								className="text-foreground hover:underline font-medium"
							>
								{displayLabel(hk.metadata)}
							</Link>
							<div className="text-[11px] text-muted-foreground font-mono truncate">
								{hk.metadata.name}
							</div>
						</Td>
						<Td>
							{hk.spec.valueFrom.kind === "stored" ? (
								<span className="text-foreground text-xs">Stored</span>
							) : (
								<span className="flex items-center gap-1 text-xs">
									<span className="text-foreground">Env</span>
									{hk.spec.valueFrom.env && (
										<code className="font-mono text-muted-foreground">
											${hk.spec.valueFrom.env}
										</code>
									)}
								</span>
							)}
						</Td>
						<Td>
							{account ? (
								<span className="text-xs text-foreground">{account}</span>
							) : (
								<span className="text-xs text-muted-foreground">—</span>
							)}
						</Td>
						<Td className="text-right tabular-nums">
							<span
								className={
									used === 0 ? "text-muted-foreground" : "text-foreground"
								}
							>
								{used}
							</span>
						</Td>
						<Td className="text-right">
							<StatusInline enabled={hk.spec.enabled !== false} />
						</Td>
					</tr>
				);
			})}
		</DetailTable>
	);
}
