import { Building2, Plus } from "lucide-react";
import { useId } from "react";
import { DefaultAccountBadge } from "@/accounts/DefaultAccountBadge";
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
import {
	type KeyAccountGroup,
	type KeyAccountOption,
	NEW_ACCOUNT,
} from "@/host-keys/hostKeyAccount";
import { HostLogo, type HostLogoLike } from "@/hosts/HostLogo";

const NEW_ACCOUNT_LABEL = "New account";

function groupLogo(group: KeyAccountGroup): HostLogoLike {
	return group.host ?? { metadata: { name: group.hostLabel }, spec: {} };
}

/** The provider account a new key joins, grouped by host, with a "New account" choice. */
export function KeyAccountSelect({
	groups,
	value,
	onChange,
	error,
	locked,
}: {
	groups: readonly KeyAccountGroup[];
	value: string;
	onChange: (accountId: string) => void;
	error?: string;
	/** Fixed by the page that opened the form; "New account" isn't offered. */
	locked: boolean;
}) {
	const errorId = useId();
	const items = [
		...groups.flatMap((g) =>
			g.accounts.map((a) => ({ value: a.value, label: a.label })),
		),
		...(locked ? [] : [{ value: NEW_ACCOUNT, label: NEW_ACCOUNT_LABEL }]),
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
			<Select
				value={value || null}
				items={items}
				onValueChange={(v) => {
					if (v) onChange(v);
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
						{value === NEW_ACCOUNT ? (
							<>
								<Plus className="text-muted-foreground" aria-hidden="true" />
								{NEW_ACCOUNT_LABEL}
							</>
						) : selected && selectedGroup ? (
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
							{groups.length > 0 && <SelectSeparator />}
							<SelectItem value={NEW_ACCOUNT}>
								<Plus className="text-muted-foreground" aria-hidden="true" />
								{NEW_ACCOUNT_LABEL}
							</SelectItem>
						</>
					)}
				</SelectContent>
			</Select>
			{error && (
				<p id={errorId} className="mt-1.5 text-[11px] text-destructive">
					{error}
				</p>
			)}
			<p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
				{locked
					? "Set by the account."
					: "Keys that share one provider organization belong in one account. Pick New account for a different organization."}
			</p>
		</div>
	);
}

function AccountItemLabel({ option }: { option: KeyAccountOption }) {
	return (
		<>
			<span>{option.label}</span>
			{option.orgId && (
				<span className="font-mono text-[11px] text-muted-foreground">
					{option.orgId}
				</span>
			)}
			{option.isDefault && <DefaultAccountBadge />}
		</>
	);
}
