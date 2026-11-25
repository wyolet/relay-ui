import { PageHeader } from "@/shared/PageHeader";
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
		<PageHeader
			title="Dashboard"
			actions={withRange ? <RangePicker /> : undefined}
		/>
	);
}

function RangePicker() {
	const range = useDashboardStore((s) => s.range);
	const setRange = useDashboardStore((s) => s.setRange);
	return (
		<Segmented value={range} onChange={setRange} options={DASHBOARD_RANGES} />
	);
}
