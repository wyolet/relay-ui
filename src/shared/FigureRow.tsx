import { Figure, FigureSkeleton } from "./Figure";

export interface FigureData {
	key: string;
	label: string;
	value: string;
	note?: string;
	trend?: (number | null)[];
}

const COLUMNS = {
	4: "grid-cols-2 lg:grid-cols-4",
	6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
} as const;

function rowClass(size: "hero" | "mini") {
	return `grid gap-x-8 gap-y-6 ${size === "hero" ? COLUMNS[4] : COLUMNS[6]}`;
}

/** A row of figures: four headline ones, or six secondary (`mini`) ones. */
export function FigureRow({
	figures,
	size = "hero",
}: {
	figures: FigureData[];
	size?: "hero" | "mini";
}) {
	return (
		<div className={rowClass(size)}>
			{figures.map((f) => (
				<Figure
					key={f.key}
					value={f.value}
					label={f.label}
					note={f.note}
					trend={f.trend}
					size={size}
				/>
			))}
		</div>
	);
}

/** A {@link FigureRow} while it loads. */
export function FigureRowSkeleton({
	size = "hero",
	trend = false,
}: {
	size?: "hero" | "mini";
	trend?: boolean;
}) {
	return (
		<div className={rowClass(size)}>
			{Array.from({ length: size === "hero" ? 4 : 6 }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder slots
				<FigureSkeleton key={i} size={size} trend={trend} />
			))}
		</div>
	);
}
