import { useRelayStatus } from "@/sign-in/useRelayStatus";

export function LiveStatus() {
	const state = useRelayStatus();
	const tone =
		state === "alive"
			? "text-brand-600 dark:text-brand-400"
			: state === "unreachable"
				? "text-destructive"
				: "text-muted-foreground";
	const label =
		state === "alive"
			? "Relay online"
			: state === "unreachable"
				? "Relay unreachable"
				: "Connecting…";
	return (
		<div className="flex items-center justify-center">
			<div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 py-1 pl-2 pr-3 text-xs font-medium text-muted-foreground">
				<span className="relative flex size-2 items-center justify-center">
					{state === "alive" && (
						<span className="absolute inline-flex size-2 animate-ping rounded-full bg-current opacity-60" />
					)}
					<span className={`relative size-2 rounded-full bg-current ${tone}`} />
				</span>
				<span className={tone}>{label}</span>
			</div>
		</div>
	);
}
