/** A bar standing in for a line of text while it loads; sized in `em`, so it
 * takes the line height of whatever text style wraps it. */
export function TextPlaceholder({ width }: { width: string }) {
	return (
		<span
			className={`inline-block h-[0.75em] rounded-bar bg-grid align-middle ${width}`}
		/>
	);
}
