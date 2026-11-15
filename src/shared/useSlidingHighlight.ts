import {
	type CSSProperties,
	type FocusEvent,
	type MouseEvent,
	useState,
} from "react";

type Slide = {
	top: number;
	height: number;
	visible: boolean;
	/** Moving from a visible row: glide. Appearing or leaving: fade in place. */
	glide: boolean;
};

const HIDDEN: Slide = { top: 0, height: 0, visible: false, glide: false };

/**
 * One highlight that glides between the hovered or focused rows instead of
 * each row painting its own. Rows sit in a `relative` box with the highlight.
 */
export function useSlidingHighlight() {
	const [slide, setSlide] = useState<Slide>(HIDDEN);
	const follow = (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
		const row = e.currentTarget;
		const top = row.offsetTop;
		// Hover also focuses the row, so the same row can arrive twice: keep its mode.
		setSlide((prev) => ({
			top,
			height: row.offsetHeight,
			visible: true,
			glide: prev.visible && (prev.top !== top || prev.glide),
		}));
	};
	const style: CSSProperties = {
		top: slide.top,
		height: slide.height,
		opacity: slide.visible ? 1 : 0,
		transitionProperty: slide.glide ? "top, height, opacity" : "opacity",
	};
	return {
		style,
		rowProps: { onMouseEnter: follow, onFocus: follow },
		listProps: {
			onMouseLeave: () =>
				setSlide((prev) => ({ ...prev, visible: false, glide: false })),
		},
	};
}
