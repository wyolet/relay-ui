import type { ReactNode } from "react";
import type { Model } from "@/api/types/model";
import { groupModelsByFamily, modelFamily } from "@/lib/modelsByHost";
import { FamilyHeading } from "@/models/FamilyHeading";
import { ModelNameCell } from "@/models/ModelNameCell";
import { Facts } from "@/shared/Facts";
import { LineRow } from "@/shared/LineGrid";

/** A detail page's model list under the models page's family headings. */
export function ModelsByFamily({
	models,
	empty,
}: {
	models: readonly Model[];
	/** Rendered instead of the list when `models` is empty. */
	empty: ReactNode;
}) {
	if (models.length === 0) return empty;
	const groups = groupModelsByFamily(models);
	const families = new Set(models.map(modelFamily)).size;
	return (
		<div className="mt-4 grid grid-cols-1 gap-6">
			<Facts
				items={[
					{ label: "Models", value: models.length },
					{ label: "Families", value: families },
				]}
			/>
			{groups.map((group) => (
				<div key={group.key} className="grid grid-cols-1">
					<FamilyHeading label={group.label} />
					{group.lines.map(({ model }) => {
						const enabled = model.spec.enabled !== false;
						return (
							<LineRow
								key={model.metadata.id ?? model.metadata.name}
								cols="grid-cols-1"
								dimmed={!enabled}
							>
								<ModelNameCell model={model} enabled={enabled} />
							</LineRow>
						);
					})}
				</div>
			))}
		</div>
	);
}
