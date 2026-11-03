import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronDown, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { HostLogo } from "@/hosts/HostLogo";
import type { UnavailablePicks } from "@/lib/workContext";
import { moveItem } from "@/policies/policyFormSpec";
import type { LinkChoice, LinkChoices } from "@/policies/usePolicyLinkChoices";
import { filterTriggerClassName } from "@/shared/MultiSelect";
import { OptionRow } from "@/shared/OptionRow";
import { NotAvailableTag } from "@/shared/ScopeNotes";

interface Props {
	choices: LinkChoices;
	onChange: (ids: string[]) => void;
	/** Rank the rows and let the operator reorder them. */
	ordered?: boolean;
	/** Extra control shown on each linked row, before its remove button. */
	renderRowControl?: (choice: LinkChoice) => ReactNode;
	addLabel: string;
	emptyText: string;
	/** Linked rows the form's workspace can't use. */
	unavailable?: UnavailablePicks;
}

/** Linked rows of one kind (pools, budgets) plus an add popover. */
export function PolicyLinkPicker({
	choices,
	onChange,
	ordered,
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
					{choices.selected.map((c, i) => (
						<LinkChoiceRow
							key={c.id}
							choice={c}
							rank={ordered ? i + 1 : undefined}
						>
							{unavailable?.ids.includes(c.id) && (
								<NotAvailableTag scope={unavailable.scope} />
							)}
							{ordered && (
								<>
									<IconButton
										icon={ArrowUp}
										label={`Move ${c.label} up`}
										disabled={i === 0}
										onClick={() => onChange(moveItem(ids, i, -1))}
									/>
									<IconButton
										icon={ArrowDown}
										label={`Move ${c.label} down`}
										disabled={i === ids.length - 1}
										onClick={() => onChange(moveItem(ids, i, 1))}
									/>
								</>
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
			<Popover>
				<PopoverTrigger
					className={`${filterTriggerClassName} self-start`}
					disabled={choices.available.length === 0}
				>
					<Plus className="size-3.5" aria-hidden />
					{addLabel}
					<ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
				</PopoverTrigger>
				<PopoverContent align="start" className="w-80 p-1">
					<ul className="flex max-h-72 flex-col overflow-y-auto">
						{choices.available.map((c) => (
							<li key={c.id}>
								<OptionRow
									onClick={() => onChange([...ids, c.id])}
									className="rounded px-2 py-1.5"
								>
									<LinkChoiceLabel choice={c} />
								</OptionRow>
							</li>
						))}
					</ul>
				</PopoverContent>
			</Popover>
		</div>
	);
}

/** Detail routes a linked row can open, keyed by slug. */
export type LinkChoiceRoute = "/pools/$name" | "/policies/budgets/$name";

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
