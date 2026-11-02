/** Read-only `shared` flag of a policy's rate-limit or budget link. */
export function SharedLinkLabel({ shared }: { shared: boolean }) {
	return (
		<span
			className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap"
			title={
				shared
					? "One count for the bound account"
					: "One count per member under the bound account"
			}
		>
			{shared ? "Shared" : "Per member"}
		</span>
	);
}
