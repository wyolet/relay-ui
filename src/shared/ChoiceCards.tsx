import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { OptionRow } from "@/shared/OptionRow";

export interface ChoiceCard<T extends string> {
	value: T;
	title: string;
	description: string;
	icon: LucideIcon;
	/** Why the card can't be picked; set, it is shown disabled. */
	unavailable?: string;
}

/** A single choice among a few options, each a card with an icon and a line of explanation. */
export function ChoiceCards<T extends string>({
	options,
	value,
	onChange,
	label,
}: {
	options: readonly ChoiceCard<T>[];
	value: T;
	onChange: (value: T) => void;
	label: string;
}) {
	return (
		<div
			role="radiogroup"
			aria-label={label}
			className={cn(
				"grid grid-cols-1 gap-3",
				options.length === 4
					? "sm:grid-cols-2 xl:grid-cols-4"
					: "sm:grid-cols-3",
			)}
		>
			{options.map((o) => {
				const Icon = o.icon;
				const selected = o.value === value;
				return (
					<OptionRow
						key={o.value}
						role="radio"
						aria-checked={selected}
						selected={selected}
						disabled={o.unavailable !== undefined}
						onClick={() => onChange(o.value)}
						className="h-full flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-4 disabled:opacity-60 disabled:hover:bg-card data-[selected]:border-primary"
					>
						<Icon className="size-4 text-muted-foreground" aria-hidden="true" />
						<span className="text-sm font-medium text-foreground">
							{o.title}
						</span>
						<span className="text-[11px] leading-relaxed text-muted-foreground">
							{o.unavailable ?? o.description}
						</span>
					</OptionRow>
				);
			})}
		</div>
	);
}
