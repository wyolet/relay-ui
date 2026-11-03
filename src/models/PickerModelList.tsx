import { HostLogo } from "@/hosts/HostLogo";
import type { CatalogRef } from "@/lib/catalogRef";
import { PickerListEmpty } from "@/models/PickerListEmpty";
import { PickerRowCheckbox } from "@/models/PickerRowCheckbox";
import { isBindingCovered, modelCheckState } from "@/models/pickerCheckState";
import type { ModelRow, PickerIndex } from "@/models/usePickerCatalog";
import { ModelPrice } from "@/pricing/ModelPrice";
import { useModelPrices } from "@/pricing/useModelPrices";
import { OptionRow } from "@/shared/OptionRow";

export function PickerModelList({
	models,
	index,
	refs,
	onToggleModel,
}: {
	models: ModelRow[];
	index: PickerIndex;
	refs: CatalogRef[];
	onToggleModel: (m: ModelRow) => void;
}) {
	const prices = useModelPrices();
	if (models.length === 0) return <PickerListEmpty label="No models" />;
	return (
		<ul className="divide-y divide-border">
			{models.map((m) => {
				const state = modelCheckState(refs, m);
				return (
					<li key={m.id}>
						<OptionRow
							onClick={() => onToggleModel(m)}
							disabled={state === "covered"}
							className="justify-between"
						>
							<span className="flex items-center gap-2.5 min-w-0">
								<PickerRowCheckbox state={state} />
								<span className="min-w-0">
									<span className="text-sm text-foreground truncate block">
										{m.displayName}
									</span>
									<code className="text-[10px] font-mono text-muted-foreground">
										{m.provider}/{m.name}
									</code>
									{m.deprecated && (
										<span className="ml-1.5 text-[10px] text-warning">
											deprecated
										</span>
									)}
								</span>
							</span>
							<span className="flex items-center gap-1">
								<span className="mr-1">
									<ModelPrice
										modelId={m.id}
										summary={prices?.get(m.id)}
										link={false}
									/>
								</span>
								{m.hostNames.map((hostName) => {
									const h = index.hostsByName.get(hostName);
									if (!h) return null;
									return (
										<span
											key={hostName}
											title={`Served via ${h.displayName}`}
											className={[
												"inline-flex items-center justify-center rounded-sm p-0.5 transition-opacity",
												isBindingCovered(refs, m, hostName)
													? "opacity-100"
													: "opacity-40",
											].join(" ")}
										>
											<HostLogo host={h.logo} size={16} />
										</span>
									);
								})}
							</span>
						</OptionRow>
					</li>
				);
			})}
		</ul>
	);
}
