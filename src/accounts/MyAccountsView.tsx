import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { AccountScopeLink } from "@/accounts/AccountScopeLink";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import { type MyAccount, useMyAccounts } from "@/api/hooks/accounts";
import { DetailTable, Td } from "@/shared/DetailTable";
import { EmptyState } from "@/shared/EmptyState";
import { StatusBadge } from "@/shared/StatusBadge";

const COLUMNS = [
	{ label: "Account" },
	{ label: "Kind" },
	{ label: "Scope" },
	{ label: "Policy" },
	{ label: "Keys" },
];

const dash = <span className="text-muted-foreground/70">—</span>;

export function MyAccountsView() {
	const { data: rows } = useMyAccounts();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-xl font-semibold text-foreground">Your accounts</h1>
				<p className="text-xs text-muted-foreground">
					The accounts you can run requests in, with the policy bound to each
					and the keys that run in it by default.
				</p>
			</div>

			{rows.length === 0 ? (
				<EmptyState
					icon={Building2}
					title="No accounts"
					body="The admin token is not a user, so it holds no accounts. Signed in as a user, you see your personal account, one per team or project membership, and the provider accounts you own."
				/>
			) : (
				<DetailTable columns={COLUMNS}>
					{rows.map((row) => (
						<MyAccountRow key={row.account.id} row={row} />
					))}
				</DetailTable>
			)}
		</div>
	);
}

function MyAccountRow({ row }: { row: MyAccount }) {
	const { account } = row;
	const label = account.displayName || account.name;
	return (
		<tr>
			<Td>
				<div className="flex items-center gap-2">
					<Link
						to="/accounts/$name"
						params={{ name: account.name }}
						className="text-sm font-medium text-foreground hover:underline"
					>
						{label}
					</Link>
					{account.closed && (
						<StatusBadge enabled={false} disabledLabel="Closed" />
					)}
				</div>
				{label !== account.name && (
					<div className="font-mono text-[11px] text-muted-foreground">
						{account.name}
					</div>
				)}
			</Td>
			<Td className="text-xs text-foreground">
				{ACCOUNT_KIND_LABELS[row.kind]}
			</Td>
			<Td>
				<AccountScopeLink scope={row.scope} />
			</Td>
			<Td className="text-xs">
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
			</Td>
			<Td className="text-xs">
				{row.tokenOnly ? (
					<span className="text-muted-foreground">
						Tokens only: takes inference tokens, not relay keys.
					</span>
				) : (row.keys ?? []).length === 0 ? (
					dash
				) : (
					<ul className="flex flex-col gap-0.5">
						{(row.keys ?? []).map((k) => (
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
				)}
			</Td>
		</tr>
	);
}
