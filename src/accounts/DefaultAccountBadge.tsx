/** Marks the account Relay made for an owner's keys at a host. */
export function DefaultAccountBadge() {
	return (
		<span
			className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
			title="Created by Relay. Keys of this owner at this host join it when they name no account."
		>
			Default
		</span>
	);
}
