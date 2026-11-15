import { Link } from "@tanstack/react-router";
import { Building2, KeyRound, Plus } from "lucide-react";
import { type ReactNode, Suspense } from "react";
import {
	ACCOUNT_MIN_W,
	AccountColumns,
	AccountLine,
	MINE_MIN_W,
	MyAccountColumns,
	MyAccountLine,
} from "@/accounts/AccountLines";
import { ACCOUNT_SIDE_HINTS } from "@/accounts/accountCopy";
import {
	ACCOUNT_FILTERS,
	type AccountFilters,
	type AccountSide,
	useAccountFilters,
	useAccountOwnerFilter,
	useAccountRows,
	useMyAccountRows,
} from "@/accounts/useAccountRows";
import { type Account, useDeleteAccount } from "@/api/hooks/accounts";
import { FilterBar, type QuickFilter } from "@/filters/FilterBar";
import {
	toolbarActionClassName,
	toolbarMainActionClassName,
} from "@/filters/ToolbarActions";
import { displayLabel } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { LineTable } from "@/shared/LineGrid";
import { OwnerFilter } from "@/shared/OwnerFilter";
import { PageLoader } from "@/shared/Spinner";
import { TableEmpty } from "@/shared/TableEmpty";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

const SIDE_OPTIONS = [
	{ value: "provider", label: "Provider", title: ACCOUNT_SIDE_HINTS.provider },
	{ value: "relay", label: "Relay", title: ACCOUNT_SIDE_HINTS.relay },
] as const;

export function AccountsTable() {
	const { filters, setFilters, setSides } = useAccountFilters();
	const owner = useAccountOwnerFilter();
	const sides: QuickFilter<AccountSide> = {
		label: "Account side",
		options: SIDE_OPTIONS,
		selected: filters.sides,
		onChange: setSides,
	};

	return (
		<div>
			<FilterBar
				defs={ACCOUNT_FILTERS}
				quick={sides}
				state={{ q: filters.q, kind: filters.kind, mine: filters.mine }}
				onChange={setFilters}
				extra={filters.mine ? undefined : <OwnerFilter filter={owner} />}
				extraActive={filters.mine || owner.isDefault ? 0 : 1}
				className="mb-3"
				actions={
					<>
						<Link to="/host-keys/new" className={toolbarMainActionClassName}>
							<KeyRound data-icon="inline-start" className="w-3.5 h-3.5" />
							Add key
						</Link>
						<Link to="/accounts/new" className={toolbarActionClassName}>
							<Plus data-icon="inline-start" className="w-3.5 h-3.5" />
							New provider account
						</Link>
					</>
				}
			/>

			<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
				{filters.mine ? (
					<MyAccountsList filters={filters} />
				) : (
					<AllAccountsList filters={filters} ownerMatches={owner.matches} />
				)}
			</Suspense>
		</div>
	);
}

function AllAccountsList({
	filters,
	ownerMatches,
}: {
	filters: AccountFilters;
	ownerMatches: (account: Account) => boolean;
}) {
	const { rows, total } = useAccountRows({ ...filters, ownerMatches });
	const del = useConfirmedDelete(useDeleteAccount(), { noun: "account" });

	return (
		<>
			{rows.length === 0 ? (
				<AccountsEmpty>
					{total === 0
						? "No accounts yet. Add a key and relay groups it into a provider account."
						: "No accounts match the current filter."}
				</AccountsEmpty>
			) : (
				<LineTable minWidth={ACCOUNT_MIN_W}>
					<AccountColumns />
					{rows.map((row) => (
						<AccountLine
							key={row.account.metadata.id ?? row.account.metadata.name}
							row={row}
							onDelete={() =>
								del.request({
									id: row.account.metadata.id ?? "",
									name: row.account.metadata.name,
									label: displayLabel(row.account.metadata),
								})
							}
						/>
					))}
				</LineTable>
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
		<LineTable minWidth={MINE_MIN_W}>
			<MyAccountColumns />
			{rows.map((row) => (
				<MyAccountLine key={row.id} row={row} />
			))}
		</LineTable>
	);
}

function AccountsEmpty({ children }: { children: ReactNode }) {
	return (
		<TableEmpty icon={Building2}>
			<p className="text-sm text-muted-foreground">{children}</p>
		</TableEmpty>
	);
}
