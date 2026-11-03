import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { HostLogo } from "@/hosts/HostLogo";
import { moveItem } from "@/lib/moveItem";
import type { LinkChoice, LinkChoices } from "@/policies/usePolicyLinkChoices";
import { AddPopover } from "@/shared/AddPopover";
import { RankControls } from "@/shared/RankControls";

interface Props {
	choices: LinkChoices;
	onChange: (ids: string[]) => void;
	/** Rank the rows and let the operator reorder them. */
	ordered?: boolean;
	/** Extra control shown on each linked row, before its remove button. */
	renderRowControl?: (choice: LinkChoice) => ReactNode;
	addLabel: string;
	emptyText: string;
}

/** Linked rows of one kind (pools, budgets) plus an add popover. */
export function PolicyLinkPicker({
	choices,
	onChange,
	ordered,
	renderRowControl,
	addLabel,
	emptyText,
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
							{renderRowControl?.(c)}
							{ordered ? (
								<RankControls
									label={c.label}
									index={i}
									count={ids.length}
									onMove={(index, delta) =>
										onChange(moveItem(ids, index, delta))
									}
									onRemove={() => onChange(ids.filter((id) => id !== c.id))}
								/>
							) : (
								<IconButton
									icon={X}
									label={`Remove ${c.label}`}
									onClick={() => onChange(ids.filter((id) => id !== c.id))}
								/>
							)}
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
