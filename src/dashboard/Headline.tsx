import { Figure } from "@/shared/Figure";
import { useHeadline } from "./useHeadline";

export function Headline() {
	return (
		<div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
			{useHeadline().map((f) => (
				<Figure
					key={f.key}
					value={f.value}
					label={f.label}
					note={f.note}
					trend={f.trend}
				/>
			))}
		</div>
	);
}
