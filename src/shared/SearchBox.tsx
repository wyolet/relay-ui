import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	fieldFocusClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import { cn } from "@/lib/utils";

interface SearchBoxProps {
	value: string;
	onChange: (next: string) => void;
	/**
	 * Delay before a keystroke is emitted via onChange. Consumers that persist
	 * to URL search params (and re-run loaders/queries) rely on this; pass 0
	 * only for cheap local-state filtering.
	 */
	debounceMs?: number;
	placeholder?: string;
	"aria-label"?: string;
	/** Focus this box when "/" is pressed outside another editable element. */
	hotkey?: boolean;
	className?: string;
}

export function SearchBox({
	value,
	onChange,
	debounceMs = 250,
	placeholder = "Search",
	"aria-label": ariaLabel,
	hotkey = true,
	className = "",
}: SearchBoxProps) {
	// The input is driven by a local draft so typing stays instant; the parent
	// value (URL state) only updates after the debounce settles.
	const [draft, setDraft] = useState(value);
	const [focused, setFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const timer = useRef<number | undefined>(undefined);
	const lastEmitted = useRef(value);

	// Adopt external changes (Clear button, back/forward nav) — but not the
	// echo of our own emission coming back down as a prop.
	useEffect(() => {
		if (value !== lastEmitted.current) {
			lastEmitted.current = value;
			setDraft(value);
			window.clearTimeout(timer.current);
		}
	}, [value]);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	useEffect(() => {
		if (!hotkey) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "/" || e.defaultPrevented) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const t = e.target;
			if (
				t instanceof HTMLElement &&
				(t.tagName === "INPUT" ||
					t.tagName === "TEXTAREA" ||
					t.tagName === "SELECT" ||
					t.isContentEditable)
			)
				return;
			e.preventDefault();
			inputRef.current?.focus();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [hotkey]);

	const emit = (next: string) => {
		window.clearTimeout(timer.current);
		lastEmitted.current = next;
		onChange(next);
	};

	const handleInput = (next: string) => {
		setDraft(next);
		if (debounceMs <= 0) {
			emit(next);
			return;
		}
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			lastEmitted.current = next;
			onChange(next);
		}, debounceMs);
	};

	const clear = () => {
		setDraft("");
		emit("");
		inputRef.current?.focus();
	};

	return (
		<div className={`relative w-56 ${className}`}>
			<Search
				className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
				aria-hidden="true"
			/>
			<input
				ref={inputRef}
				type="search"
				value={draft}
				onChange={(e) => handleInput(e.currentTarget.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onKeyDown={(e) => {
					if (e.key === "Enter") emit(draft);
					else if (e.key === "Escape") {
						if (draft) {
							e.preventDefault();
							clear();
						} else {
							inputRef.current?.blur();
						}
					}
				}}
				placeholder={placeholder}
				aria-label={ariaLabel ?? placeholder}
				className={cn(
					"w-full h-8 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-[color,box-shadow,background-color] [&::-webkit-search-cancel-button]:hidden",
					fieldFrameClassName,
					fieldFocusClassName,
				)}
			/>
			{draft ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={clear}
					aria-label="Clear search"
					className="absolute right-1.5 top-1/2 -mt-2.5 text-muted-foreground"
				>
					<X className="size-3.5" aria-hidden />
				</Button>
			) : (
				hotkey &&
				!focused && (
					<kbd
						aria-hidden
						className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none rounded border border-border bg-muted px-1 py-px font-mono text-[10px] leading-4 text-muted-foreground"
					>
						/
					</kbd>
				)
			)}
		</div>
	);
}
