import type { CatalogRef } from "@/lib/catalogRef";
import { PickerListEmpty } from "@/models/PickerListEmpty";
import { PickerRowCheckbox } from "@/models/PickerRowCheckbox";
import { isProviderSelected } from "@/models/pickerCheckState";
import type { PickerIndex, ProviderRow } from "@/models/usePickerCatalog";
import { OptionRow } from "@/shared/OptionRow";

export function PickerProviderList({
	providers,
	index,
	refs,
	onToggle,
}: {
	providers: ProviderRow[];
	index: PickerIndex;
	refs: CatalogRef[];
	onToggle: (p: ProviderRow) => void;
}) {
	if (providers.length === 0) return <PickerListEmpty label="No providers" />;
	return (
		<ul className="divide-y divide-border">
			{providers.map((p) => {
				const modelCount = (index.modelsByProvider.get(p.name) ?? []).length;
				return (
					<li key={p.id}>
						<OptionRow onClick={() => onToggle(p)} className="justify-between">
							<span className="flex items-center gap-2.5 min-w-0">
								<PickerRowCheckbox
									state={isProviderSelected(refs, p.name) ? "on" : "off"}
								/>
								<span className="text-sm text-foreground truncate">
									{p.displayName}
								</span>
								<code className="text-[10px] font-mono text-muted-foreground">
									{p.name}
								</code>
							</span>
							<span className="text-[11px] text-muted-foreground tabular-nums">
								{modelCount} model{modelCount === 1 ? "" : "s"}
							</span>
						</OptionRow>
					</li>
				);
			})}
		</ul>
	);
}
