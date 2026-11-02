import { Building2, Plus } from "lucide-react";
import { useId } from "react";
import { DefaultAccountBadge } from "@/accounts/DefaultAccountBadge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	KeyAccountGroup,
	KeyAccountOption,
} from "@/host-keys/hostKeyAccount";
import { HostLogo, type HostLogoLike } from "@/hosts/HostLogo";
import { middleTruncate } from "@/lib/middleTruncate";

const NEW_ACCOUNT_LABEL = "New account…";

// Picking this item opens the new-account dialog; it never becomes the value.
const NEW_ACCOUNT_ITEM = "+new";

function groupLogo(group: KeyAccountGroup): HostLogoLike {
	return group.host ?? { metadata: { name: group.hostLabel }, spec: {} };
}

/** The provider account a new key joins, grouped by host, with a "New account…" choice. */
export function KeyAccountSelect({
	groups,
	value,
	onChange,
	onNewAccount,
	error,
	locked,
}: {
	groups: readonly KeyAccountGroup[];
	value: string;
	onChange: (accountId: string) => void;
	onNewAccount: () => void;
	error?: string;
	/** Fixed by the page that opened the form; "New account…" isn't offered. */
	locked: boolean;
}) {
	const errorId = useId();
	const items = [
		...groups.flatMap((g) =>
			g.accounts.map((a) => ({ value: a.value, label: a.label })),
		),
		...(locked ? [] : [{ value: NEW_ACCOUNT_ITEM, label: NEW_ACCOUNT_LABEL }]),
	];
	const selectedGroup = groups.find((g) =>
		g.accounts.some((a) => a.value === value),
	);
	const selected = selectedGroup?.accounts.find((a) => a.value === value);

	return (
		<div>
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1 inline-flex items-center gap-1">
				<Building2 className="w-3 h-3" />
				Account
			</div>
			{groups.length === 0 && !locked ? (
				<div className="flex max-w-md items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2.5">
					<span className="text-xs text-muted-foreground">
						No provider accounts yet.
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onNewAccount}
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? errorId : undefined}
					>
						<Plus aria-hidden="true" />
						{NEW_ACCOUNT_LABEL}
					</Button>
				</div>
			) : (
				<Select
					value={value || null}
					items={items}
					onValueChange={(v) => {
						if (v === NEW_ACCOUNT_ITEM) onNewAccount();
						else if (v) onChange(v);
					}}
					disabled={locked}
				>
					<SelectTrigger
						className="w-full max-w-md"
						aria-label="Account"
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? errorId : undefined}
					>
						<SelectValue placeholder="Pick an account…">
							{selected && selectedGroup ? (
								<>
									<HostLogo host={groupLogo(selectedGroup)} size={16} />
									<span className="truncate">{selected.label}</span>
									<span className="truncate text-muted-foreground">
										{selectedGroup.hostLabel}
									</span>
								</>
							) : undefined}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{groups.map((g) => (
							<SelectGroup key={g.hostId}>
								<SelectLabel className="flex items-center gap-1.5">
									<HostLogo host={groupLogo(g)} size={14} />
									{g.hostLabel}
								</SelectLabel>
								{g.accounts.map((a) => (
									<SelectItem key={a.value} value={a.value}>
										<AccountItemLabel option={a} />
									</SelectItem>
								))}
							</SelectGroup>
						))}
						{!locked && (
							<>
								<SelectSeparator />
								<SelectItem value={NEW_ACCOUNT_ITEM}>
									<Plus className="text-muted-foreground" aria-hidden="true" />
									{NEW_ACCOUNT_LABEL}
								</SelectItem>
							</>
						)}
					</SelectContent>
				</Select>
			)}
			{error && (
				<p id={errorId} className="mt-1.5 text-[11px] text-destructive">
					{error}
				</p>
			)}
			<p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
				{locked
					? "Set by the account."
					: "Keys that share one provider organization belong in one account. Pick New account… for a different organization."}
			</p>
		</div>
	);
}

function AccountItemLabel({ option }: { option: KeyAccountOption }) {
	return (
		<>
			<span>{option.label}</span>
			{option.orgId && (
				<span
					className="font-mono text-[11px] text-muted-foreground"
					title={option.orgId}
				>
					{middleTruncate(option.orgId)}
				</span>
			)}
			{option.isDefault && <DefaultAccountBadge />}
		</>
	);
}
