import { fmtDate } from "@/lib/format";

const quietBadgeClass =
	"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border";

/**
 * The canonical enabled/disabled pill and owner pill shared by every detail
 * view. `enabledLabel`/`disabledLabel` let a caller relabel the states (e.g.
 * keys read "Active"); `title` lets the owner pill carry a per-domain
 * tooltip.
 */
export function StatusBadge({
	enabled,
	enabledLabel = "Enabled",
	disabledLabel = "Disabled",
}: {
	enabled: boolean;
	enabledLabel?: string;
	disabledLabel?: string;
}) {
	return enabled ? (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-soft text-success border border-success/30">
			{enabledLabel}
		</span>
	) : (
		<span className={quietBadgeClass}>{disabledLabel}</span>
	);
}

export function OwnerBadge({
	label,
	title = `${label}-owned and managed by Relay.`,
}: {
	label: string;
	title?: string;
}) {
	return (
		<span className={quietBadgeClass} title={title}>
			{label}-owned
		</span>
	);
}

/** Marks a row a catalog upgrade stopped shipping; renders nothing otherwise. */
export function CatalogDetachedBadge({
	detachedAt,
}: {
	detachedAt: string | undefined;
}) {
	if (!detachedAt) return null;
	return (
		<span
			className={`${quietBadgeClass} shrink-0 whitespace-nowrap`}
			title={`Removed from catalog on ${fmtDate(detachedAt)}, yours to delete.`}
		>
			Removed from catalog
		</span>
	);
}

/** Text-only enabled/disabled state for dense table rows. */
export function StatusInline({ enabled }: { enabled: boolean }) {
	return enabled ? (
		<span className="text-[11px] text-success">Enabled</span>
	) : (
		<span className="text-[11px] text-muted-foreground">Disabled</span>
	);
}
