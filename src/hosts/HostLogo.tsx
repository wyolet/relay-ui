import { useState } from "react";
import type { Host } from "@/api/types/host";
import { displayLabel } from "@/lib/displayLabel";

interface HostLogoProps {
	host: Pick<Host, "metadata" | "spec">;
	size?: number;
	className?: string;
}

/**
 * Square logo for a host. Uses `host.spec.icon.path` when set; falls back to a
 * neutral initial badge so the slot stays consistent.
 */
export function HostLogo({ host, size = 16, className }: HostLogoProps) {
	const url = host.spec.icon?.path;
	const [errored, setErrored] = useState(false);
	const label = displayLabel(host.metadata);
	const initial = label.trim().charAt(0).toUpperCase() || "?";
	const style = { width: size, height: size } as const;

	if (!url || errored) {
		return (
			<span
				aria-hidden="true"
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
	return (
		<span
			className={[
				"inline-flex shrink-0 items-center justify-center rounded-sm bg-primary p-0.5",
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
				className="max-w-full max-h-full object-contain"
			/>
		</span>
	);
}
