import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { HostLogo } from "@/hosts/HostLogo";
import type { UnavailablePicks } from "@/lib/workContext";
import type { LinkChoice, LinkChoices } from "@/policies/usePolicyLinkChoices";
import { AddPopover } from "@/shared/AddPopover";
import { NotAvailableTag } from "@/shared/ScopeNotes";

interface Props {
	choices: LinkChoices;
	onChange: (ids: string[]) => void;
	/** Extra control shown on each linked row, before its remove button. */
	renderRowControl?: (choice: LinkChoice) => ReactNode;
	addLabel: string;
	emptyText: string;
	/** Linked rows the form's workspace can't use. */
	unavailable?: UnavailablePicks;
}

/** Linked rows of one kind (budgets) plus an add popover. */
export function PolicyLinkPicker({
	choices,
	onChange,
	renderRowControl,
	addLabel,
	emptyText,
	unavailable,
}: Props) {
	const ids = choices.selected.map((c) => c.id);
	return (
		<div className="flex flex-col gap-2">
			{choices.selected.length === 0 ? (
				<p className="text-[11px] text-muted-foreground">{emptyText}</p>
			) : (
				<ul className="rounded-md border border-border bg-card divide-y divide-border">
					{choices.selected.map((c) => (
						<LinkChoiceRow key={c.id} choice={c}>
							{unavailable?.ids.includes(c.id) && (
								<NotAvailableTag scope={unavailable.scope} />
							)}
							{renderRowControl?.(c)}
							<IconButton
								icon={X}
								label={`Remove ${c.label}`}
								onClick={() => onChange(ids.filter((id) => id !== c.id))}
							/>
						</LinkChoiceRow>
					))}
				</ul>
			)}
			<AddPopover
				label={addLabel}
				groups={[{ options: choices.available }]}
				renderOption={(c) => <LinkChoiceLabel choice={c} />}
				onAdd={(c) => onChange([...ids, c.id])}
			/>
		</div>
	);
}

/** Detail routes a linked row can open, keyed by slug. */
export type LinkChoiceRoute =
	| "/pools/$name"
	| "/policies/budgets/$name"
	| "/accounts/$name";

/** One linked row; `rank` marks an ordered list, `children` are trailing actions. */
export function LinkChoiceRow({
	choice,
	rank,
	linkTo,
	children,
}: {
	choice: LinkChoice;
	rank?: number;
	linkTo?: LinkChoiceRoute;
	children?: ReactNode;
}) {
	return (
		<li className="flex items-center gap-3 px-3 py-2">
			{rank !== undefined && (
				<span className="w-4 text-[11px] text-muted-foreground tabular-nums">
					{rank}
				</span>
			)}
			{linkTo ? (
				<Link
					to={linkTo}
					params={{ name: choice.name }}
					className="flex min-w-0 flex-1 hover:underline"
				>
					<LinkChoiceLabel choice={choice} />
				</Link>
			) : (
				<LinkChoiceLabel choice={choice} />
			)}
			{children}
		</li>
	);
}

export function LinkChoiceLabel({ choice }: { choice: LinkChoice }) {
	return (
		<span className="flex min-w-0 flex-1 items-center gap-2">
			{choice.host && <HostLogo host={choice.host} size={18} />}
			<span className="flex min-w-0 flex-col">
				<span className="truncate text-sm text-foreground">{choice.label}</span>
				<span className="truncate text-[11px] text-muted-foreground">
					{choice.meta}
				</span>
			</span>
		</span>
	);
}
