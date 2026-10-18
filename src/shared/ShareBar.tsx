/** A row's share as a rounded bar on a rail. */
export function ShareBar({ share, lead }: { share: number; lead?: boolean }) {
	return (
		<span className="block h-2 rounded-bar bg-track">
			<span
				className="block h-full rounded-bar"
				style={{
					width: `${share > 0 ? Math.max(share * 100, 2) : 0}%`,
					backgroundColor: lead ? "var(--chart-1)" : "var(--chart-2)",
				}}
			/>
		</span>
	);
}
