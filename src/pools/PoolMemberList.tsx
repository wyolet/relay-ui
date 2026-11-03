import { SharedByBadge } from "@/accounts/SharedByBadge";
import type { UnavailablePicks } from "@/lib/workContext";
import type { PoolMemberOption } from "@/pools/poolMembers";
import { AddPopover } from "@/shared/AddPopover";
import { RankControls } from "@/shared/RankControls";
import { NotAvailableTag } from "@/shared/ScopeNotes";
import { StatusInline } from "@/shared/StatusBadge";

interface MemberEdits {
	add: (id: string) => void;
	remove: (id: string) => void;
	move: (index: number, delta: -1 | 1) => void;
}

/**
 * A pool's members as one ranked list: its accounts, then its single keys,
 * which is the order relay tries them in. Each part reorders within itself.
 */
export function PoolMemberList({
	accounts,
	keys,
	availableAccounts,
	availableKeys,
	accountEdits,
	keyEdits,
	unavailableAccounts,
	unavailableKeys,
}: {
	accounts: readonly PoolMemberOption[];
	keys: readonly PoolMemberOption[];
	availableAccounts: readonly PoolMemberOption[];
	availableKeys: readonly PoolMemberOption[];
	accountEdits: MemberEdits;
	keyEdits: MemberEdits;
	/** Chosen members the form's workspace can't use. */
	unavailableAccounts?: UnavailablePicks;
	unavailableKeys?: UnavailablePicks;
}) {
	const empty = accounts.length === 0 && keys.length === 0;
	return (
		<div className="flex max-w-xl flex-col gap-2">
			{empty ? (
				<p className="rounded-md border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
					No members yet. Add an account to bring every key it holds, now and
					later, or single credentials.
				</p>
			) : (
				<ol className="divide-y divide-border rounded-md border border-border bg-card">
					{accounts.map((m, i) => (
						<MemberRow
							key={m.id}
							rank={i + 1}
							option={m}
							unavailable={unavailableAccounts}
						>
							<RankControls
								label={m.label}
								index={i}
								count={accounts.length}
								onMove={accountEdits.move}
								onRemove={() => accountEdits.remove(m.id)}
							/>
						</MemberRow>
					))}
					{keys.map((m, i) => (
						<MemberRow
							key={m.id}
							rank={accounts.length + i + 1}
							option={m}
							unavailable={unavailableKeys}
						>
							<RankControls
								label={m.label}
								index={i}
								count={keys.length}
								onMove={keyEdits.move}
								onRemove={() => keyEdits.remove(m.id)}
							/>
						</MemberRow>
					))}
				</ol>
			)}
			<AddPopover
				label="Add member"
				groups={[
					{ title: "Accounts", options: availableAccounts },
					{ title: "Credentials", options: availableKeys },
				]}
				renderOption={(m) => <MemberLabel option={m} />}
				onAdd={(m) =>
					availableAccounts.includes(m)
						? accountEdits.add(m.id)
						: keyEdits.add(m.id)
				}
			/>
		</div>
	);
}

function MemberRow({
	rank,
	option,
	unavailable,
	children,
}: {
	rank: number;
	option: PoolMemberOption;
	unavailable: UnavailablePicks | undefined;
	children: React.ReactNode;
}) {
	return (
		<li className="flex items-center gap-3 px-3 py-2">
			<span className="w-4 text-[11px] text-muted-foreground tabular-nums">
				{rank}
			</span>
			<MemberLabel option={option} />
			{unavailable?.ids.includes(option.id) && (
				<NotAvailableTag scope={unavailable.scope} />
			)}
			{children}
		</li>
	);
}

function MemberLabel({ option }: { option: PoolMemberOption }) {
	return (
		<span className="flex min-w-0 flex-1 flex-col">
			<span className="flex min-w-0 items-baseline gap-2">
				<span className="truncate text-sm text-foreground">{option.label}</span>
				{option.label !== option.name && (
					<span className="truncate font-mono text-[11px] text-muted-foreground">
						{option.name}
					</span>
				)}
				{option.sharedBy !== undefined && (
					<SharedByBadge name={option.sharedBy} />
				)}
				{!option.enabled && <StatusInline enabled={false} />}
			</span>
			{option.meta && (
				<span className="truncate text-[11px] text-muted-foreground">
					{option.meta}
				</span>
			)}
		</span>
	);
}
