import { useState } from "react";

/** Logo edge in px: beside one line of text, beside a title over its slug, and in a detail page header. */
export const logoSize = { line: 20, stacked: 32, header: 48 } as const;

/**
 * A catalog object's square icon by `path`, or its initial when there is none
 * or the file fails to load. Catalog icons carry their own background (a tile
 * behind marks that need one), so the file renders as-is in both themes.
 */
export function CatalogIcon({
	path,
	label,
	size = 16,
	className,
	titleTooltip,
}: {
	path?: string;
	label: string;
	size?: number;
	className?: string;
	/** When true, the label is set as a `title` for native tooltips. */
	titleTooltip?: boolean;
}) {
	// Remember which path failed, so a changed path gets its own try instead
	// of staying an initial.
	const [failed, setFailed] = useState<string>();
	const style = { width: size, height: size } as const;
	const title = titleTooltip ? label : undefined;

	if (!path || failed === path) {
		return (
			<span
				aria-hidden="true"
				title={title}
				className={[
					"inline-flex shrink-0 items-center justify-center rounded-sm bg-muted font-medium text-muted-foreground",
					className ?? "",
				].join(" ")}
				style={{ ...style, fontSize: Math.max(10, Math.round(size * 0.45)) }}
			>
				{label.trim().charAt(0).toUpperCase() || "?"}
			</span>
		);
	}
	return (
		<span
			title={title}
			className={[
				"inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm",
				className ?? "",
			].join(" ")}
			style={style}
		>
			<img
				src={path}
				alt=""
				aria-hidden="true"
				loading="lazy"
				onError={() => setFailed(path)}
				className="h-full w-full object-contain"
			/>
		</span>
	);
}
