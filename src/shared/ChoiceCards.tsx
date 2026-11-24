import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { OptionRow } from "@/shared/OptionRow";

export interface ChoiceCard<T extends string> {
	value: T;
	title: string;
	description: string;
	icon: LucideIcon;
	/** Why the card can't be picked; set, it is dimmed and shows this instead of its description. */
	unavailable?: string;
}

/**
 * A single choice among a few options, each a card with an icon and a line of
 * explanation. An unavailable card stays focusable so its reason is read.
 */
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
		<fieldset
			aria-label={label}
			className={cn(
				"grid min-w-0 grid-cols-1 gap-3",
				options.length === 4
					? "sm:grid-cols-2 xl:grid-cols-4"
					: "sm:grid-cols-3",
			)}
		>
			{options.map((o) => {
				const Icon = o.icon;
				const selected = o.value === value;
				const unavailable = o.unavailable !== undefined;
				return (
					<OptionRow
						key={o.value}
						aria-pressed={selected}
						aria-disabled={unavailable ? "true" : undefined}
						selected={selected}
						onClick={() => {
							if (!unavailable) onChange(o.value);
						}}
						className="h-full flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-4 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-card data-[selected]:border-primary"
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
		</fieldset>
	);
}
