/** Relative time windows offered for the logs feed → server `since`. */
export const SINCE_VALUES = ["1h", "6h", "24h", "7d", "30d"] as const;
export type Since = (typeof SINCE_VALUES)[number];

/** HTTP status bands → server `status_class`. "" = all. */
export const STATUS_CLASS_VALUES = ["", "2xx", "4xx", "5xx"] as const;
export type StatusClass = (typeof STATUS_CLASS_VALUES)[number];

export const WINDOW_OPTIONS: readonly { value: Since; label: string }[] = [
	{ value: "1h", label: "Last 1h" },
	{ value: "6h", label: "Last 6h" },
	{ value: "24h", label: "Last 24h" },
	{ value: "7d", label: "Last 7d" },
	{ value: "30d", label: "Last 30d" },
];

export const STATUS_OPTIONS: readonly { value: StatusClass; label: string }[] =
	[
		{ value: "", label: "All status" },
		{ value: "2xx", label: "2xx" },
		{ value: "4xx", label: "4xx" },
		{ value: "5xx", label: "5xx" },
	];

/** Hours each window spans, for counting filter choices over the same slice. */
export const SINCE_HOURS: Record<Since, number> = {
	"1h": 1,
	"6h": 6,
	"24h": 24,
	"7d": 7 * 24,
	"30d": 30 * 24,
};
