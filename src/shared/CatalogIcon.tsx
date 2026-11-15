import { useState } from "react";

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
	// Remember which path failed, so a new path (or the same file served
	// later) gets its own try instead of staying an initial.
	const [failed, setFailed] = useState<string>();
	const style = { width: size, height: size } as const;
	const title = titleTooltip ? label : undefined;

	if (!path || failed === path) {
		return (
			<span
				aria-hidden="true"
				title={title}
				className={[
					"inline-flex shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] font-medium text-muted-foreground",
					className ?? "",
				].join(" ")}
				style={style}
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
