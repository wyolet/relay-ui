import { Link } from "@tanstack/react-router";
import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { useAccounts } from "@/api/hooks/accounts";
import { useDeleteHostKey, useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";
import { buttonVariants } from "@/components/ui/button";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import { useHostKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { RowMenu } from "@/shared/RowMenu";
import { SearchBox } from "@/shared/SearchBox";
import { TableEmpty } from "@/shared/TableEmpty";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

function HostKeyDiagDot({ id }: { id: string | undefined }) {
	const diagnostics = useHostKeyDiagnostics(id);
	return <DiagnosticDot diagnostics={diagnostics} />;
}

export function HostKeysTable() {
	const { data: hostKeysData } = useHostKeys();
	const { data: hostsData } = useHosts();
	const { data: accountsData } = useAccounts();
	const del = useConfirmedDelete(useDeleteHostKey(), { noun: "credential" });
	const [q, setQ] = useState("");

	const hostById = new Map<string, Host>();
	for (const h of hostsData.items ?? []) {
		if (h.metadata.id) hostById.set(h.metadata.id, h);
	}
	const hostLabels = new Map<string, string>();
	for (const [id, h] of hostById.entries()) {
		hostLabels.set(id, displayLabel(h.metadata));
	}
	const accountLabels = new Map<string, string>();
	for (const a of accountsData.items ?? []) {
		if (a.metadata.id)
			accountLabels.set(a.metadata.id, displayLabel(a.metadata));
	}

	const allItems = hostKeysData.items ?? [];
	const needle = q.trim().toLowerCase();
	const items = needle
		? allItems.filter((hk) => {
				const hostLabel = hostLabels.get(hk.spec.hostId) ?? "";
				const accountLabel = accountLabels.get(hk.spec.accountId ?? "") ?? "";
				return (
					displayLabel(hk.metadata).toLowerCase().includes(needle) ||
					hk.metadata.name.toLowerCase().includes(needle) ||
					hostLabel.toLowerCase().includes(needle) ||
					accountLabel.toLowerCase().includes(needle) ||
					(hk.spec.valueFrom.env?.toLowerCase().includes(needle) ?? false)
				);
			})
		: allItems;

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox
						value={q}
						onChange={setQ}
						placeholder="Search credentials"
					/>
				}
				actions={
					<Link
						to="/host-keys/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New credential
					</Link>
				}
			/>

			{items.length === 0 ? (
				<TableEmpty icon={KeyRound}>
					{allItems.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No credentials yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Register upstream credentials — stored encrypted by Relay or
								sourced from an env var.
							</p>
							<Link
								to="/host-keys/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create your first credential
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No credentials match the current filter.
						</p>
					)}
				</TableEmpty>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Host</Th>
								<Th variant="column">Account</Th>
								<Th variant="column">Source</Th>
								<Th variant="column" align="right">
									Used by
								</Th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((hk) => {
								const isStored = hk.spec.valueFrom.kind === "stored";
								const refCount = hk.policies?.length ?? 0;
								const enabled = hk.spec.enabled ?? true;
								const host = hostById.get(hk.spec.hostId);
								const hostLabel =
									hostLabels.get(hk.spec.hostId) ??
									`Unknown (${hk.spec.hostId.slice(0, 6)}…)`;
								const accountId = hk.spec.accountId;
								const accountLabel = accountId
									? (accountLabels.get(accountId) ??
										`Unknown (${accountId.slice(0, 6)}…)`)
									: null;
								return (
									<tr
										key={hk.metadata.name}
										className={[
											"border-t border-border transition-colors",
											enabled
												? "hover:bg-muted/40"
												: "bg-muted/30 text-muted-foreground/80",
										].join(" ")}
									>
										<td className="px-3 py-2">
											<Link
												to="/host-keys/$name"
												params={{ name: hk.metadata.name }}
												className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
											>
												<div className="flex items-center gap-2 text-sm font-medium text-foreground">
													<span>{displayLabel(hk.metadata)}</span>
													<HostKeyDiagDot id={hk.metadata.id} />
												</div>
												{hasDisplayName(hk.metadata) && (
													<div className="font-mono text-[11px] text-muted-foreground">
														{hk.metadata.name}
													</div>
												)}
											</Link>
										</td>
										<td className="px-3 py-2">
											<HostCell
												host={host}
												fallbackLabel={hostLabel}
												size="sm"
											/>
										</td>
										<td className="px-3 py-2">
											{accountLabel ? (
												<span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
													{accountLabel}
												</span>
											) : (
												<span className="text-[11px] text-muted-foreground/70">
													—
												</span>
											)}
										</td>
										<td className="px-3 py-2 text-xs">
											{isStored ? (
												<span className="text-foreground">Stored</span>
											) : (
												<span className="flex items-center gap-1">
													<span className="text-foreground">Env</span>
													{hk.spec.valueFrom.env && (
														<span className="font-mono text-muted-foreground">
															${hk.spec.valueFrom.env}
														</span>
													)}
												</span>
											)}
										</td>
										<td className="px-3 py-2 text-right text-xs tabular-nums">
											{refCount === 0 ? (
												<span className="text-muted-foreground/70">
													Unattached
												</span>
											) : (
												<span className="text-foreground">
													{refCount} {refCount === 1 ? "policy" : "policies"}
												</span>
											)}
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/host-keys/$name/edit"
																params={{ name: hk.metadata.name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () =>
															del.request({
																id: hk.metadata.id ?? "",
																name: hk.metadata.name,
																label: displayLabel(hk.metadata),
															}),
													},
												]}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</div>
	);
}
