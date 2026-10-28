import { useHasTraffic } from "@/api/hooks/usage";
import { useDashboardWindow } from "./useDashboardWindow";

/** Whether the selected period saw any request, and how to name the period. */
export function useDashboardTraffic() {
	const { win, period } = useDashboardWindow();
	return { hasTraffic: useHasTraffic(win), period };
}
