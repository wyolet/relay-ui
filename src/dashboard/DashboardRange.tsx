import { Segmented } from "@/shared/Segmented";
import { useDashboardStore } from "@/stores/dashboard";
import { DASHBOARD_RANGES } from "./useDashboardWindow";

/** The period every dashboard block reads. */
export function DashboardRange() {
	const range = useDashboardStore((s) => s.range);
	const setRange = useDashboardStore((s) => s.setRange);
	return (
		<div className="flex justify-end">
			<Segmented value={range} onChange={setRange} options={DASHBOARD_RANGES} />
		</div>
	);
}
