import { Link } from "@tanstack/react-router";
import { Building2, KeyRound, Plus } from "lucide-react";
import { AccountHolderLink } from "@/accounts/AccountHolderLink";
import { ACCOUNT_SUMMARY } from "@/accounts/accountCopy";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import { DefaultAccountBadge } from "@/accounts/DefaultAccountBadge";
import { SharedByBadge } from "@/accounts/SharedByBadge";
import { ACCOUNT_FILTERS, useAccountRows } from "@/accounts/useAccountRows";
import { useDeleteAccount } from "@/api/hooks/accounts";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { type MenuAction, RowMenu } from "@/shared/RowMenu";
import { StatusBadge } from "@/shared/StatusBadge";
import { TableEmpty } from "@/shared/TableEmpty";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const dash = <span className="text-muted-foreground/70">—</span>;

export function AccountsTable() {
	const { rows, total, filters, setFilters } = useAccountRows();
	const del = useConfirmedDelete(useDeleteAccount(), { noun: "account" });

	return (
		<div>
			<p className="mb-3 text-xs text-muted-foreground">{ACCOUNT_SUMMARY}</p>
			<TableToolbar
				search={
					<FilterBar
						defs={ACCOUNT_FILTERS}
						state={filters}
						onChange={setFilters}
					/>
				}
				actions={
					<>
						<Link
							to="/accounts/new"
							className={buttonVariants({ variant: "outline", size: "lg" })}
						>
							<Plus className="w-3.5 h-3.5" />
							New provider account
						</Link>
						<Link
							to="/host-keys/new"
							className={buttonVariants({ variant: "default", size: "lg" })}
						>
							<KeyRound className="w-3.5 h-3.5" />
							Add key
						</Link>
					</>
				}
			/>

			{rows.length === 0 ? (
				<TableEmpty icon={Building2}>
					<p className="text-sm text-muted-foreground">
						{total === 0
							? "No accounts yet."
							: "No accounts match the current filter."}
					</p>
				</TableEmpty>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Kind</Th>
								<Th variant="column">Holder</Th>
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
							{rows.map(
								({ account, holder, provider, sharedBy, deletable }) => {
									const name = account.metadata.name;
									const actions: MenuAction[] = [
										{
											label: "Edit",
											render: (
												<Link to="/accounts/$name/edit" params={{ name }} />
											),
										},
									];
									if (deletable) {
										actions.push({
											label: "Delete",
											danger: true,
											onClick: () =>
												del.request({
													id: account.metadata.id ?? "",
													name,
													label: displayLabel(account.metadata),
												}),
										});
									}
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
														{sharedBy !== undefined && (
															<SharedByBadge name={sharedBy} />
														)}
														{account.spec.closed && (
															<StatusBadge
																enabled={false}
																disabledLabel="Closed"
															/>
														)}
													</div>
													{hasDisplayName(account.metadata) && (
														<div className="font-mono text-[11px] text-muted-foreground">
															{name}
														</div>
													)}
												</Link>
											</td>
											<td className="px-3 py-2 text-xs text-foreground">
												{ACCOUNT_KIND_LABELS[account.spec.kind]}
											</td>
											<td className="px-3 py-2">
												{holder ? <AccountHolderLink holder={holder} /> : dash}
											</td>
											<td className="px-3 py-2">
												{provider ? (
													<HostCell
														host={provider.host}
														fallbackLabel={provider.hostLabel}
														size="sm"
													/>
												) : (
													dash
												)}
											</td>
											<td className="px-3 py-2 font-mono text-[11px] text-foreground">
												{(provider && account.spec.orgId) || dash}
											</td>
											<td className="px-3 py-2 text-right text-xs tabular-nums text-foreground">
												{provider ? provider.keyCount : dash}
											</td>
											<td className="px-3 py-2 text-right">
												<RowMenu actions={actions} />
											</td>
										</tr>
									);
								},
							)}
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
