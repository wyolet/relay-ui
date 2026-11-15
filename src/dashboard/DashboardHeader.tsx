import { Segmented } from "@/shared/Segmented";
import { useDashboardStore } from "@/stores/dashboard";
import { DASHBOARD_RANGES } from "./useDashboardWindow";

/** The page title, with the period every usage block reads when shown. */
export function DashboardHeader({
	withRange = false,
}: {
	withRange?: boolean;
}) {
	return (
		<header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
			<h1 className="font-display text-section text-foreground">Dashboard</h1>
			{withRange && <RangePicker />}
		</header>
	);
}

function RangePicker() {
	const range = useDashboardStore((s) => s.range);
	const setRange = useDashboardStore((s) => s.setRange);
	return (
		<Segmented value={range} onChange={setRange} options={DASHBOARD_RANGES} />
	);
}
