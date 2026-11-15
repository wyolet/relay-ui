import { type FocusEvent, type MouseEvent, useState } from "react";

type Box = { top: number; height: number };

/**
 * One highlight that glides to the hovered or focused row instead of each row
 * painting its own. Rows sit in a `relative` box that also holds the highlight.
 */
export function useSlidingHighlight() {
	const [box, setBox] = useState<Box | null>(null);
	const follow = (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
		const row = e.currentTarget;
		setBox({ top: row.offsetTop, height: row.offsetHeight });
	};
	return {
		/** Where the highlight sits; null hides it. */
		box,
		rowProps: { onMouseEnter: follow, onFocus: follow },
		listProps: { onMouseLeave: () => setBox(null) },
	};
}
