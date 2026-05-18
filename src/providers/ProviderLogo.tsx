import { useState } from "react";
import type { Provider } from "@/api/types/provider";
import { displayLabel } from "@/lib/displayLabel";

interface ProviderLogoProps {
	provider: Pick<Provider, "metadata" | "spec">;
	size?: number;
	className?: string;
	titleTooltip?: boolean;
}

/**
 * Square logo for a provider. Mirrors `HostLogo` — uses `spec.icon.path` when
 * present, falls back to an initial badge.
 */
export function ProviderLogo({
	provider,
	size = 16,
	className,
	titleTooltip,
}: ProviderLogoProps) {
	const url = provider.spec.icon?.path;
	const [errored, setErrored] = useState(false);
	const label = displayLabel(provider.metadata);
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
