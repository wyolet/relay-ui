import { Link } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { ACCOUNT_SUMMARY } from "@/accounts/accountCopy";
import { DefaultAccountBadge } from "@/accounts/DefaultAccountBadge";
import { useAccountRows } from "@/accounts/useAccountRows";
import { useDeleteAccount } from "@/api/hooks/accounts";
import { buttonVariants } from "@/components/ui/button";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { RowMenu } from "@/shared/RowMenu";
import { SearchBox } from "@/shared/SearchBox";
import { TableEmpty } from "@/shared/TableEmpty";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function AccountsTable() {
	const { rows, total, q, setQ } = useAccountRows();
	const del = useConfirmedDelete(useDeleteAccount(), { noun: "account" });

	return (
		<div>
			<p className="mb-3 text-xs text-muted-foreground">{ACCOUNT_SUMMARY}</p>
			<TableToolbar
				search={
					<SearchBox value={q} onChange={setQ} placeholder="Search accounts" />
				}
				actions={
					<Link
						to="/accounts/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New account
					</Link>
				}
			/>

			{rows.length === 0 ? (
				<TableEmpty icon={Building2}>
					<p className="text-sm text-muted-foreground">
						{total === 0
							? "No accounts yet. Relay makes a default one per owner and host when a credential needs it."
							: "No accounts match the current filter."}
					</p>
				</TableEmpty>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Host</Th>
								<Th variant="column">Organization</Th>
								<Th variant="column" align="right">
									Keys
								</Th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{rows.map(({ account, host, hostLabel, keyCount }) => {
								const name = account.metadata.name;
								return (
									<tr
										key={account.metadata.id ?? name}
										className="border-t border-border hover:bg-muted/40 transition-colors"
									>
										<td className="px-3 py-2">
											<Link
												to="/accounts/$name"
												params={{ name }}
												className="block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<div className="flex items-center gap-2 text-sm font-medium text-foreground">
													<span>{displayLabel(account.metadata)}</span>
													{account.spec.default && <DefaultAccountBadge />}
												</div>
												{hasDisplayName(account.metadata) && (
													<div className="font-mono text-[11px] text-muted-foreground">
														{name}
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
										<td className="px-3 py-2 font-mono text-[11px] text-foreground">
											{account.spec.orgId || (
												<span className="text-muted-foreground/70">—</span>
											)}
										</td>
										<td className="px-3 py-2 text-right text-xs tabular-nums text-foreground">
											{keyCount}
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/accounts/$name/edit"
																params={{ name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () =>
															del.request({
																id: account.metadata.id ?? "",
																name,
																label: displayLabel(account.metadata),
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
