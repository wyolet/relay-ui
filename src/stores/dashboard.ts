import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DashboardRange = "7d" | "week" | "month";
export type DashboardMetric = "cost" | "tokens";

interface DashboardState {
	range: DashboardRange;
	chartMetric: DashboardMetric;
	heatmapMetric: DashboardMetric;
	setRange: (range: DashboardRange) => void;
	setChartMetric: (metric: DashboardMetric) => void;
	setHeatmapMetric: (metric: DashboardMetric) => void;
}

/** The dashboard's period and what its chart and heatmap measure, kept
 * across reloads. */
export const useDashboardStore = create<DashboardState>()(
	persist(
		(set) => ({
			range: "7d",
			chartMetric: "cost",
			heatmapMetric: "cost",
			setRange: (range) => set({ range }),
			setChartMetric: (chartMetric) => set({ chartMetric }),
			setHeatmapMetric: (heatmapMetric) => set({ heatmapMetric }),
		}),
		{
			name: "dashboard",
			partialize: (s) => ({
				range: s.range,
				chartMetric: s.chartMetric,
				heatmapMetric: s.heatmapMetric,
			}),
		},
	),
);
