import { Link } from "@tanstack/react-router";
import {
	Bot,
	Boxes,
	type LucideIcon,
	UserCheck,
	UserRound,
	Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { AccountHolderLink } from "@/accounts/AccountHolderLink";
import { AccountScopeLink } from "@/accounts/AccountScopeLink";
import { ACCOUNT_KIND_LABELS, type AccountKind } from "@/accounts/accountView";
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
const ACCOUNT_COLS =
	"grid-cols-[minmax(14rem,2.2fr)_minmax(5.5rem,0.7fr)_minmax(9rem,1.3fr)_minmax(3.5rem,0.4fr)_minmax(4rem,0.6fr)_minmax(4.5rem,0.6fr)_2rem]";
export const ACCOUNT_MIN_W = "min-w-[47rem]";
const MINE_COLS =
	"grid-cols-[minmax(12rem,1.6fr)_minmax(6rem,0.8fr)_minmax(8rem,1.2fr)_minmax(8rem,1.2fr)_minmax(12rem,1.6fr)]";
export const MINE_MIN_W = "min-w-[49rem]";

/** The mark before a relay account's name, where a provider's logo sits. */
const KIND_ICONS: Record<Exclude<AccountKind, "provider">, LucideIcon> = {
	team: Users,
	project: Boxes,
	personal: UserRound,
	member: UserCheck,
	service: Bot,
};

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

export function AccountColumns() {
	return (
		<LineColumns cols={ACCOUNT_COLS}>
			<span>Account</span>
			<span>Kind</span>
			<span>Belongs to</span>
			<span className="text-right">Keys</span>
			<span
				className="text-right"
				title="Last 7 days: drawn from a provider account, charged to a relay one"
			>
				Req 7d
			</span>
			<span
				className="text-right"
				title="Last 7 days: drawn from a provider account, charged to a relay one"
			>
				Spend 7d
			</span>
			<span />
		</LineColumns>
	);
}

/** One account: a provider's leads with its logo and counts the keys it holds;
 * a relay one names its holder. */
export function AccountLine({
	row,
	onDelete,
}: {
	row: AccountRow;
	onDelete: () => void;
}) {
	const { account, provider, holder } = row;
	const { kind, orgId } = account.spec;
	return (
		<LineRow cols={ACCOUNT_COLS} dimmed={account.spec.closed}>
			<span className="flex min-w-0 items-center gap-2.5">
				{kind === "provider" ? (
					<CatalogIcon
						path={provider?.host?.spec.icon?.path}
						label={provider?.hostLabel ?? ""}
						size={24}
						titleTooltip
					/>
				) : (
					<KindMark kind={kind} />
				)}
				<AccountName row={row} />
			</span>
			<span className="truncate">{ACCOUNT_KIND_LABELS[kind]}</span>
			<span className="min-w-0 truncate">
				{kind === "provider" ? (
					orgId ? (
						<span
							className="font-mono text-foot"
							title="Organization at the provider"
						>
							<ShortId value={orgId} />
						</span>
					) : (
						<Dash />
					)
				) : holder ? (
					<AccountHolderLink holder={holder} />
				) : (
					<Dash />
				)}
			</span>
			<NumberCell
				value={provider?.keyCount ? String(provider.keyCount) : null}
			/>
			<UsageCells usage={row.usage} />
			<AccountMenu row={row} onDelete={onDelete} />
		</LineRow>
	);
}

function KindMark({ kind }: { kind: Exclude<AccountKind, "provider"> }) {
	const Icon = KIND_ICONS[kind];
	return (
		<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-ink-3">
			<Icon className="size-3.5" aria-hidden />
		</span>
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
