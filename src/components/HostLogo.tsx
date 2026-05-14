import { useState } from "react";
import type { Host } from "@/api/types/host";
import { displayLabel } from "@/lib/displayLabel";

interface HostLogoProps {
	host: Pick<Host, "metadata" | "spec">;
	size?: number;
	className?: string;
}

/**
 * Square logo for a host. Uses `host.spec.logoURL` when set; falls back to a
 * neutral initial badge so the slot stays consistent.
 */
export function HostLogo({ host, size = 16, className }: HostLogoProps) {
	const url = host.spec.logoURL;
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
		<img
			src={url}
			alt=""
			aria-hidden="true"
			loading="lazy"
			onError={() => setErrored(true)}
			className={[
				"inline-block shrink-0 rounded-sm object-contain",
				className ?? "",
			].join(" ")}
			style={style}
		/>
	);
}
