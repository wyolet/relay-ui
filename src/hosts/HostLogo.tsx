import { useState } from "react";
import { displayLabel } from "@/lib/displayLabel";

/** Only the fields the logo actually reads — full `Host` and compact graph
 * host rows both satisfy this. */
export interface HostLogoLike {
	metadata: { name: string; displayName?: string };
	spec: { icon?: { path?: string } };
}

interface HostLogoProps {
	host: HostLogoLike;
	size?: number;
	className?: string;
	/** When true, the host label is set as a `title` for native tooltips. */
	titleTooltip?: boolean;
}

/**
 * Square logo for a host. Uses `host.spec.icon.path` when set; falls back to a
 * neutral initial badge so the slot stays consistent.
 */
export function HostLogo({
	host,
	size = 16,
	className,
	titleTooltip,
}: HostLogoProps) {
	const url = host.spec.icon?.path;
	const [errored, setErrored] = useState(false);
	const label = displayLabel(host.metadata);
	const initial = label.trim().charAt(0).toUpperCase() || "?";
	const style = { width: size, height: size } as const;

	const title = titleTooltip ? label : undefined;
	if (!url || errored) {
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
				{initial}
			</span>
		);
	}
	// SVGs are typically authored with the right transparency/contrast for
	// either theme. Raster formats (png/jpg/webp) often ship dark line art on
	// a transparent canvas, so we pad them on a white tile to stay legible in
	// dark mode without per-file edits.
	const isRaster = /\.(png|jpe?g|webp)(\?|$)/i.test(url);
	return (
		<span
			title={title}
			className={[
				"inline-flex shrink-0 items-center justify-center rounded-sm overflow-hidden",
				isRaster ? "bg-white p-[1px]" : "",
				className ?? "",
			].join(" ")}
			style={style}
		>
			<img
				src={url}
				alt=""
				aria-hidden="true"
				loading="lazy"
				onError={() => setErrored(true)}
				className="w-full h-full object-contain"
			/>
		</span>
	);
}
