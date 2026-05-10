import { Check, ChevronDown, Search, X } from "lucide-react";
import {
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

export interface MultiSelectOption {
	value: string;
	label: string;
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

// Legacy hand-rolled MultiSelect kept around in case the shadcn-based one
// (Popover + Command) doesn't fit a future need. Not imported anywhere.
export function MultiSelectLegacy({
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
	const [q, setQ] = useState("");
	const rootRef = useRef<HTMLDivElement | null>(null);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const popoverRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const listboxId = useId();
	const [pos, setPos] = useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

	useEffect(() => {
		if (!open) return;
		function onDown(e: MouseEvent) {
			const t = e.target as Node;
			if (rootRef.current?.contains(t)) return;
			if (popoverRef.current?.contains(t)) return;
			setOpen(false);
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	useLayoutEffect(() => {
		if (!open) {
			setPos(null);
			return;
		}
		const trigger = triggerRef.current;
		if (!trigger) return;
		const dialog = trigger.closest("dialog");
		setPortalTarget(dialog ?? document.body);
		function update() {
			const t = triggerRef.current;
			if (!t) return;
			const r = t.getBoundingClientRect();
			setPos({ top: r.bottom + 4, left: r.left, width: r.width });
		}
		update();
		window.addEventListener("scroll", update, true);
		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("scroll", update, true);
			window.removeEventListener("resize", update);
		};
	}, [open]);

	useEffect(() => {
		if (open) {
			setQ("");
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	const labelByValue = useMemo(() => {
		const m = new Map<string, string>();
		for (const o of options) m.set(o.value, o.label);
		return m;
	}, [options]);

	const filtered = useMemo(() => {
		const ql = q.trim().toLowerCase();
		if (!ql) return options;
		return options.filter(
			(o) =>
				o.label.toLowerCase().includes(ql) ||
				o.value.toLowerCase().includes(ql),
		);
	}, [options, q]);

	const allSelected = options.length > 0 && selected.length === options.length;
	const someSelected = selected.length > 0 && !allSelected;

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

	return (
		<div ref={rootRef} className="relative">
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listboxId}
				aria-label={ariaLabel}
				onClick={() => setOpen((v) => !v)}
				className="w-full min-h-8 inline-flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-2 pr-1.5 py-1 text-left text-xs text-neutral-900 dark:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				<div className="flex-1 min-w-0 flex flex-wrap items-center gap-1">
					{selected.length === 0 ? (
						<span className="text-neutral-400 dark:text-neutral-500">
							{placeholder}
						</span>
					) : (
						<>
							{visibleChips.map((v) => (
								<span
									key={v}
									className="inline-flex items-center gap-1 h-5 pl-1.5 pr-0.5 rounded bg-brand-600/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-[11px] font-medium"
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
										className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-brand-600/20 dark:hover:bg-brand-500/25"
									>
										<X className="w-3 h-3" />
									</button>
								</span>
							))}
							{overflow > 0 && (
								<span className="text-[11px] text-neutral-500 dark:text-neutral-400">
									+{overflow}
								</span>
							)}
						</>
					)}
				</div>
				<ChevronDown
					className={`w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
				/>
			</button>

			{open &&
				pos &&
				portalTarget &&
				createPortal(
					<div
						ref={popoverRef}
						id={listboxId}
						role="listbox"
						aria-multiselectable
						style={{
							position: "fixed",
							top: pos.top,
							left: pos.left,
							width: Math.max(pos.width, 240),
						}}
						className="z-[60] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg shadow-black/10 dark:shadow-black/40 overflow-hidden"
					>
						<div className="relative border-b border-neutral-200 dark:border-neutral-800">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
							<input
								ref={inputRef}
								type="search"
								value={q}
								onChange={(e) => setQ(e.currentTarget.value)}
								placeholder="Search…"
								className="w-full h-8 pl-8 pr-2 text-xs bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
							/>
						</div>
						<div className="max-h-56 overflow-y-auto py-1">
							{filtered.length === 0 ? (
								<div className="px-3 py-4 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
									{options.length === 0 ? emptyHint : "No matches."}
								</div>
							) : (
								filtered.map((opt) => {
									const on = selected.includes(opt.value);
									return (
										<button
											key={opt.value}
											type="button"
											role="option"
											aria-selected={on}
											onClick={() => toggle(opt.value)}
											className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800/60"
										>
											<span
												className={`flex h-4 w-4 items-center justify-center rounded border ${
													on
														? "bg-brand-600 border-brand-600 text-white"
														: "border-neutral-300 dark:border-neutral-600"
												}`}
											>
												{on && <Check className="w-3 h-3" strokeWidth={3} />}
											</span>
											<span className="flex-1 truncate text-left">
												{opt.label}
											</span>
										</button>
									);
								})
							)}
						</div>
						{options.length > 0 && (
							<div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 px-2 py-1.5">
								<button
									type="button"
									onClick={selectAll}
									disabled={allSelected}
									className="h-6 px-1.5 rounded text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 disabled:opacity-40 disabled:cursor-not-allowed"
								>
									Select all
								</button>
								<button
									type="button"
									onClick={clear}
									disabled={!someSelected && !allSelected}
									className="h-6 px-1.5 rounded text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 disabled:opacity-40 disabled:cursor-not-allowed"
								>
									Clear
								</button>
							</div>
						)}
					</div>,
					portalTarget,
				)}
		</div>
	);
}
