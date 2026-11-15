import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AccountHolderLink } from "@/accounts/AccountHolderLink";
import { AccountScopeLink } from "@/accounts/AccountScopeLink";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import { GroupedByRelayBadge } from "@/accounts/GroupedByRelayBadge";
import type { MyAccountRow } from "@/accounts/myAccountRows";
import { SharedByBadge } from "@/accounts/SharedByBadge";
import type { AccountRow } from "@/accounts/useAccountRows";
import { PlanIssueDot } from "@/diagnostics/DiagnosticDot";
import { displayLabel } from "@/lib/displayLabel";
import { fmtCompact } from "@/lib/format";
import { CatalogIcon } from "@/shared/CatalogIcon";
import {
	LineColumns,
	LineName,
	LineRow,
	NumberCell,
	QuietTag,
} from "@/shared/LineGrid";
import { type MenuAction, RowMenu } from "@/shared/RowMenu";
import { ShortId } from "@/shared/ShortId";
import { fmtMoneyCompact } from "@/usage/format";

// Each template's track minimums plus gaps come to its table's min-w.
const PROVIDER_COLS =
	"grid-cols-[minmax(14rem,2.4fr)_minmax(8rem,1fr)_minmax(4rem,0.5fr)_minmax(4rem,0.6fr)_minmax(4.5rem,0.6fr)_2rem]";
export const PROVIDER_MIN_W = "min-w-[41rem]";
const RELAY_COLS =
	"grid-cols-[minmax(14rem,2fr)_minmax(6rem,0.8fr)_minmax(10rem,1.5fr)_minmax(4rem,0.6fr)_minmax(4.5rem,0.6fr)_2rem]";
export const RELAY_MIN_W = "min-w-[45rem]";
const MINE_COLS =
	"grid-cols-[minmax(12rem,1.6fr)_minmax(6rem,0.8fr)_minmax(8rem,1.2fr)_minmax(8rem,1.2fr)_minmax(12rem,1.6fr)]";
export const MINE_MIN_W = "min-w-[49rem]";

function UsageHeads({ verb }: { verb: string }) {
	return (
		<>
			<span className="text-right" title={`Requests ${verb}, last 7 days`}>
				Req 7d
			</span>
			<span className="text-right" title={`Spend ${verb}, last 7 days`}>
				Spend 7d
			</span>
		</>
	);
}

function UsageCells({ usage }: { usage: AccountRow["usage"] }) {
	return (
		<>
			<NumberCell value={usage?.requests ? fmtCompact(usage.requests) : null} />
			<NumberCell
				value={usage?.usd != null ? fmtMoneyCompact(usage.usd, "USD") : null}
			/>
		</>
	);
}

function Dash() {
	return <span className="text-ink-3">—</span>;
}

/** The account's linked name, with its tags and plan issues beside it. */
function AccountName({ row }: { row: AccountRow }) {
	const { account, sharedBy } = row;
	const name = account.metadata.name;
	return (
		<LineName
			slug={name}
			name={
				<Link
					to="/accounts/$name"
					params={{ name }}
					className="truncate text-foreground hover:underline"
				>
					{displayLabel(account.metadata)}
				</Link>
			}
		>
			{account.spec.groupedByRelay && <GroupedByRelayBadge />}
			{sharedBy !== undefined && <SharedByBadge name={sharedBy} />}
			{account.spec.closed && <QuietTag>closed</QuietTag>}
			<PlanIssueDot kind="account" id={account.metadata.id} />
		</LineName>
	);
}

function AccountMenu({
	row,
	onDelete,
}: {
	row: AccountRow;
	onDelete: () => void;
}) {
	const name = row.account.metadata.name;
	const actions: MenuAction[] = [
		{
			label: "Edit",
			render: <Link to="/accounts/$name/edit" params={{ name }} />,
		},
	];
	if (row.deletable) {
		actions.push({ label: "Delete", danger: true, onClick: onDelete });
	}
	return (
		<span className="flex justify-end">
			<RowMenu actions={actions} />
		</span>
	);
}

export function ProviderAccountColumns() {
	return (
		<LineColumns cols={PROVIDER_COLS}>
			<span>Account</span>
			<span>Organization</span>
			<span className="text-right">Keys</span>
			<UsageHeads verb="drawn from it" />
			<span />
		</LineColumns>
	);
}

/** A provider account, led by its provider's logo; traffic is what it served. */
export function ProviderAccountLine({
	row,
	onDelete,
}: {
	row: AccountRow;
	onDelete: () => void;
}) {
	const { account, provider } = row;
	return (
		<LineRow cols={PROVIDER_COLS} dimmed={account.spec.closed}>
			<span className="flex min-w-0 items-center gap-2.5">
				<CatalogIcon
					path={provider?.host?.spec.icon?.path}
					label={provider?.hostLabel ?? ""}
					size={24}
					titleTooltip
				/>
				<AccountName row={row} />
			</span>
			<span className="truncate font-mono text-foot">
				{account.spec.orgId ? <ShortId value={account.spec.orgId} /> : <Dash />}
			</span>
			<NumberCell
				value={provider?.keyCount ? String(provider.keyCount) : null}
			/>
			<UsageCells usage={row.usage} />
			<AccountMenu row={row} onDelete={onDelete} />
		</LineRow>
	);
}

export function RelayAccountColumns() {
	return (
		<LineColumns cols={RELAY_COLS}>
			<span>Account</span>
			<span>Kind</span>
			<span>Holder</span>
			<UsageHeads verb="charged to it" />
			<span />
		</LineColumns>
	);
}

/** An account relay made for a holder; traffic is what ran in it. */
export function RelayAccountLine({
	row,
	onDelete,
}: {
	row: AccountRow;
	onDelete: () => void;
}) {
	const { account, holder } = row;
	return (
		<LineRow cols={RELAY_COLS} dimmed={account.spec.closed}>
			<AccountName row={row} />
			<span className="truncate">{ACCOUNT_KIND_LABELS[account.spec.kind]}</span>
			<span className="min-w-0 truncate">
				{holder ? <AccountHolderLink holder={holder} /> : <Dash />}
			</span>
			<UsageCells usage={row.usage} />
			<AccountMenu row={row} onDelete={onDelete} />
		</LineRow>
	);
}

export function MyAccountColumns() {
	return (
		<LineColumns cols={MINE_COLS}>
			<span>Account</span>
			<span>Kind</span>
			<span>Scope</span>
			<span>Policy</span>
			<span>Your keys</span>
		</LineColumns>
	);
}

/** One of the caller's accounts: where it sits, its policy, their keys in it. */
export function MyAccountLine({ row }: { row: MyAccountRow }) {
	return (
		<LineRow cols={MINE_COLS} dimmed={row.closed}>
			<LineName
				slug={row.name}
				name={
					<Link
						to="/accounts/$name"
						params={{ name: row.name }}
						className="truncate text-foreground hover:underline"
					>
						{row.label}
					</Link>
				}
			>
				{row.closed && <QuietTag>closed</QuietTag>}
			</LineName>
			<span className="truncate">{ACCOUNT_KIND_LABELS[row.kind]}</span>
			<span className="min-w-0 truncate">
				<AccountScopeLink scope={row.scope} />
			</span>
			<span className="min-w-0 truncate">
				{row.policy ? (
					<Link
						to="/policies/$name"
						params={{ name: row.policy.name }}
						className="text-foreground hover:underline"
					>
						{row.policy.name}
					</Link>
				) : (
					<span className="text-ink-3">No policy</span>
				)}
			</span>
			<YourKeys row={row} />
		</LineRow>
	);
}

function YourKeys({ row }: { row: MyAccountRow }): ReactNode {
	if (row.tokenOnly) {
		return (
			<span className="text-ink-3">
				Tokens only: takes inference tokens, not relay keys.
			</span>
		);
	}
	if (row.keys.length === 0) return <Dash />;
	return (
		<ul className="flex min-w-0 flex-col gap-0.5">
			{row.keys.map((k) => (
				<li key={k.id} className="truncate">
					<Link
						to="/keys/$name"
						params={{ name: k.name }}
						className="inline-flex items-baseline gap-1.5 text-foreground hover:underline"
					>
						{k.name}
						<code className="font-mono text-foot text-ink-3">{k.prefix}…</code>
					</Link>
				</li>
			))}
		</ul>
	);
}
