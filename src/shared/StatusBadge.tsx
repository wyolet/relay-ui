/**
 * The canonical enabled/disabled pill and owner pill shared by every detail
 * view. `enabledLabel`/`disabledLabel` let a caller relabel the states (e.g.
 * relay keys read "Active"); `title` lets the owner pill carry a per-domain
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
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
			{disabledLabel}
		</span>
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
		<span
			className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
			title={title}
		>
			{label}-owned
		</span>
	);
}
