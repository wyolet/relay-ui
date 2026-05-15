import { Check, ChevronDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export interface MultiSelectOption {
	value: string;
	label: string;
	/** Secondary line shown in the popover items (not in chips). */
	description?: string;
}

interface MultiSelectProps {
	options: MultiSelectOption[];
	selected: string[];
	onChange: (next: string[]) => void;
	placeholder?: string;
	emptyHint?: string;
	disabled?: boolean;
	maxChips?: number;
	"aria-label"?: string;
}

export function MultiSelect({
	options,
	selected,
	onChange,
	placeholder = "Select…",
	emptyHint = "Nothing to pick.",
	disabled,
	maxChips = 3,
	"aria-label": ariaLabel,
}: MultiSelectProps) {
	const [open, setOpen] = useState(false);

	const labelByValue = useMemo(() => {
		const m = new Map<string, string>();
		for (const o of options) m.set(o.value, o.label);
		return m;
	}, [options]);

	function toggle(v: string) {
		onChange(
			selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v],
		);
	}

	function clear() {
		onChange([]);
	}

	function selectAll() {
		onChange(options.map((o) => o.value));
	}

	const visibleChips = selected.slice(0, maxChips);
	const overflow = selected.length - visibleChips.length;
	const allSelected = options.length > 0 && selected.length === options.length;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				disabled={disabled}
				aria-label={ariaLabel}
				className="w-full min-h-9 inline-flex items-center gap-1.5 rounded-md border border-input bg-input/30 pl-2 pr-1.5 py-1 text-left text-xs text-foreground hover:bg-input/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				<div className="flex-1 min-w-0 flex flex-wrap items-center gap-1">
					{selected.length === 0 ? (
						<span className="text-muted-foreground">{placeholder}</span>
					) : (
						<>
							{visibleChips.map((v) => (
								<span
									key={v}
									className="inline-flex items-center gap-1 h-5 pl-1.5 pr-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium"
								>
									<span className="truncate max-w-[120px]">
										{labelByValue.get(v) ?? v}
									</span>
									<button
										type="button"
										aria-label={`Remove ${labelByValue.get(v) ?? v}`}
										onClick={(e) => {
											e.stopPropagation();
											toggle(v);
										}}
										className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-primary/20"
									>
										<X className="w-3 h-3" />
									</button>
								</span>
							))}
							{overflow > 0 && (
								<span className="text-[11px] text-muted-foreground">
									+{overflow}
								</span>
							)}
						</>
					)}
				</div>
				<ChevronDown
					className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
				/>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[var(--anchor-width)] min-w-[240px] p-0"
			>
				{/*
				 * `defaultValue=" "` prevents cmdk from auto-selecting the first
				 * item on mount and calling `scrollIntoView` on it — that call
				 * yanked the document because the popup hadn't finished
				 * positioning yet. User keyboard/pointer interaction still
				 * highlights items normally afterwards.
				 */}
				<Command defaultValue=" ">
					<CommandInput placeholder="Search…" />
					<CommandList>
						<CommandEmpty>
							{options.length === 0 ? emptyHint : "No matches."}
						</CommandEmpty>
						<CommandGroup>
							{options.map((opt) => {
								const on = selected.includes(opt.value);
								return (
									<CommandItem
										key={opt.value}
										value={`${opt.label} ${opt.description ?? ""} ${opt.value}`}
										onSelect={() => toggle(opt.value)}
									>
										<span
											className={`flex h-4 w-4 items-center justify-center rounded border ${
												on
													? "bg-primary border-primary text-primary-foreground"
													: "border-input"
											}`}
										>
											{on && <Check className="w-3 h-3" strokeWidth={3} />}
										</span>
										<span className="flex-1 min-w-0">
											<span className="block truncate">{opt.label}</span>
											{opt.description && (
												<span className="block truncate text-[10px] text-muted-foreground font-mono">
													{opt.description}
												</span>
											)}
										</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
					{options.length > 0 && (
						<div className="flex items-center justify-between border-t border-border px-2 py-1.5">
							<button
								type="button"
								onClick={selectAll}
								disabled={allSelected}
								className="h-6 px-1.5 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
							>
								Select all
							</button>
							<button
								type="button"
								onClick={clear}
								disabled={selected.length === 0}
								className="h-6 px-1.5 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
							>
								Clear
							</button>
						</div>
					)}
				</Command>
			</PopoverContent>
		</Popover>
	);
}
