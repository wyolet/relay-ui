import type { Host } from "@/api/types/host";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

interface HostCellProps {
	host: Host | undefined;
	/** Used when `host` is undefined (deleted / unresolved). */
	fallbackLabel?: string;
	size?: "sm" | "md";
	/** Optional badge (e.g. diagnostic dot) shown next to the label. */
	accessory?: React.ReactNode;
}

/**
 * Logo · displayLabel · `(no display name)` hint · mono slug underneath.
 * Use in tables/lists wherever a host is the row's primary subject.
 */
export function HostCell({
	host,
	fallbackLabel = "Unknown host",
	size = "md",
	accessory,
}: HostCellProps) {
	const logoSize = size === "sm" ? 24 : 32;
	const labelClass =
		size === "sm" ? "text-sm text-foreground" : "text-sm font-medium text-foreground";
	const slugClass =
		size === "sm"
			? "font-mono text-[10px] text-muted-foreground truncate"
			: "font-mono text-[11px] text-muted-foreground truncate";
	const hintClass =
		size === "sm"
			? "text-[10px] text-muted-foreground"
			: "text-[11px] text-muted-foreground";

	if (!host) {
		return (
			<div className="flex items-center gap-2.5 min-w-0">
				<div
					style={{ width: logoSize, height: logoSize }}
					className="rounded-md bg-muted border border-border shrink-0"
				/>
				<span className={`${labelClass} truncate`}>{fallbackLabel}</span>
			</div>
		);
	}

	const showSlug = hasDisplayName(host.metadata);
	return (
		<div className="flex items-center gap-2.5 min-w-0">
			<HostLogo host={host} size={logoSize} />
			<div className="min-w-0">
				<div className="flex items-center gap-1.5 min-w-0">
					<span className={`${labelClass} truncate`}>
						{displayLabel(host.metadata)}
					</span>
					{!showSlug && <span className={hintClass}>(no display name)</span>}
					{accessory}
				</div>
				{showSlug && (
					<div className={slugClass}>{host.metadata.name}</div>
				)}
			</div>
		</div>
	);
}
