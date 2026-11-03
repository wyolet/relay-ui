import { Link } from "@tanstack/react-router";
import { Building2, KeyRound, Plus } from "lucide-react";
import { type ReactNode, Suspense } from "react";
import { AccountHolderLink } from "@/accounts/AccountHolderLink";
import { AccountScopeLink } from "@/accounts/AccountScopeLink";
import { ACCOUNT_SUMMARY } from "@/accounts/accountCopy";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import { GroupedByRelayBadge } from "@/accounts/GroupedByRelayBadge";
import type { MyAccountRow } from "@/accounts/myAccountRows";
import { SharedByBadge } from "@/accounts/SharedByBadge";
import {
	ACCOUNT_FILTERS,
	type AccountFilters,
	useAccountFilters,
	useAccountRows,
	useMyAccountRows,
} from "@/accounts/useAccountRows";
import { useDeleteAccount } from "@/api/hooks/accounts";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { type MenuAction, RowMenu } from "@/shared/RowMenu";
import { ShortId } from "@/shared/ShortId";
import { PageLoader } from "@/shared/Spinner";
import { StatusBadge } from "@/shared/StatusBadge";
import { TableEmpty } from "@/shared/TableEmpty";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const dash = <span className="text-muted-foreground/70">—</span>;

interface Column {
	label: string;
	align?: "left" | "right";
}

const ALL_COLUMNS: Column[] = [
	{ label: "Name" },
	{ label: "Kind" },
	{ label: "Holder" },
	{ label: "Host" },
	{ label: "Organization" },
	{ label: "Keys", align: "right" },
];

const MINE_COLUMNS: Column[] = [
	{ label: "Account" },
	{ label: "Kind" },
	{ label: "Scope" },
	{ label: "Policy" },
	{ label: "Your keys" },
];

const rowClass = "border-t border-border hover:bg-muted/40 transition-colors";

export function AccountsTable() {
	const { filters, setFilters } = useAccountFilters();

	return (
		<div>
			<p className="mb-3 text-xs text-muted-foreground">{ACCOUNT_SUMMARY}</p>
			<TableToolbar
				search={
					<FilterBar
						defs={ACCOUNT_FILTERS}
						state={{ ...filters }}
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

			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				{filters.mine ? (
					<MyAccountsList filters={filters} />
				) : (
					<AllAccountsList filters={filters} />
				)}
			</Suspense>
		</div>
	);
}

function AllAccountsList({ filters }: { filters: AccountFilters }) {
	const { rows, total } = useAccountRows(filters);
	const del = useConfirmedDelete(useDeleteAccount(), { noun: "account" });

	return (
		<>
			{rows.length === 0 ? (
				<AccountsEmpty>
					{total === 0
						? "No accounts yet."
						: "No accounts match the current filter."}
				</AccountsEmpty>
			) : (
				<AccountsTableFrame columns={ALL_COLUMNS} withActions>
					{rows.map(({ account, holder, provider, sharedBy, deletable }) => {
						const name = account.metadata.name;
						const actions: MenuAction[] = [
							{
								label: "Edit",
								render: <Link to="/accounts/$name/edit" params={{ name }} />,
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
							<tr key={account.metadata.id ?? name} className={rowClass}>
								<td className="px-3 py-2">
									<AccountNameCell
										name={name}
										label={displayLabel(account.metadata)}
										showName={hasDisplayName(account.metadata)}
									>
										{account.spec.groupedByRelay && <GroupedByRelayBadge />}
										{sharedBy !== undefined && (
											<SharedByBadge name={sharedBy} />
										)}
										{account.spec.closed && (
											<StatusBadge enabled={false} disabledLabel="Closed" />
										)}
									</AccountNameCell>
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
									{provider && account.spec.orgId ? (
										<ShortId value={account.spec.orgId} />
									) : (
										dash
									)}
								</td>
								<td className="px-3 py-2 text-right text-xs tabular-nums text-foreground">
									{provider ? provider.keyCount : dash}
								</td>
								<td className="px-3 py-2 text-right">
									<RowMenu actions={actions} />
								</td>
							</tr>
						);
					})}
				</AccountsTableFrame>
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
		</>
	);
}

function MyAccountsList({ filters }: { filters: AccountFilters }) {
	const { rows, total } = useMyAccountRows(filters);

	if (rows.length === 0) {
		return (
			<AccountsEmpty>
				{total === 0
					? "You don't run requests in any account yet."
					: "No accounts match the current filter."}
			</AccountsEmpty>
		);
	}
	return (
		<AccountsTableFrame columns={MINE_COLUMNS}>
			{rows.map((row) => (
				<tr key={row.id} className={rowClass}>
					<td className="px-3 py-2">
						<AccountNameCell
							name={row.name}
							label={row.label}
							showName={row.showName}
						>
							{row.closed && (
								<StatusBadge enabled={false} disabledLabel="Closed" />
							)}
						</AccountNameCell>
					</td>
					<td className="px-3 py-2 text-xs text-foreground">
						{ACCOUNT_KIND_LABELS[row.kind]}
					</td>
					<td className="px-3 py-2">
						<AccountScopeLink scope={row.scope} />
					</td>
					<td className="px-3 py-2 text-xs">
						{row.policy ? (
							<Link
								to="/policies/$name"
								params={{ name: row.policy.name }}
								className="text-foreground hover:underline"
							>
								{row.policy.name}
							</Link>
						) : (
							<span className="text-muted-foreground">No policy</span>
						)}
					</td>
					<td className="px-3 py-2 text-xs">
						<YourKeys row={row} />
					</td>
				</tr>
			))}
		</AccountsTableFrame>
	);
}

function YourKeys({ row }: { row: MyAccountRow }) {
	if (row.tokenOnly) {
		return (
			<span className="text-muted-foreground">
				Tokens only: takes inference tokens, not relay keys.
			</span>
		);
	}
	if (row.keys.length === 0) return dash;
	return (
		<ul className="flex flex-col gap-0.5">
			{row.keys.map((k) => (
				<li key={k.id}>
					<Link
						to="/keys/$name"
						params={{ name: k.name }}
						className="inline-flex items-baseline gap-1.5 text-foreground hover:underline"
					>
						{k.name}
						<code className="font-mono text-[11px] text-muted-foreground">
							{k.prefix}…
						</code>
					</Link>
				</li>
			))}
		</ul>
	);
}

function AccountsTableFrame({
	columns,
	withActions = false,
	children,
}: {
	columns: readonly Column[];
	withActions?: boolean;
	children: ReactNode;
}) {
	return (
		<div className="overflow-x-auto rounded-lg border border-border bg-card">
			<table className="w-full border-collapse">
				<thead className="bg-muted/40">
					<tr>
						{columns.map((c) => (
							<Th key={c.label} variant="column" align={c.align}>
								{c.label}
							</Th>
						))}
						{withActions && (
							<th scope="col" className="w-10 px-3 py-2" aria-label="Actions" />
						)}
					</tr>
				</thead>
				<tbody>{children}</tbody>
			</table>
		</div>
	);
}

/** The account's label linking to it, its badges, and the slug under a display name. */
function AccountNameCell({
	name,
	label,
	showName,
	children,
}: {
	name: string;
	label: string;
	showName: boolean;
	children?: ReactNode;
}) {
	return (
		<Link
			to="/accounts/$name"
			params={{ name }}
			className="block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<div className="flex items-center gap-2 text-sm font-medium text-foreground">
				<span>{label}</span>
				{children}
			</div>
			{showName && (
				<div className="font-mono text-[11px] text-muted-foreground">
					{name}
				</div>
			)}
		</Link>
	);
}

function AccountsEmpty({ children }: { children: ReactNode }) {
	return (
		<TableEmpty icon={Building2}>
			<p className="text-sm text-muted-foreground">{children}</p>
		</TableEmpty>
	);
}
