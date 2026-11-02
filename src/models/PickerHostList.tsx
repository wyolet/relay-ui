import { HostLogo } from "@/hosts/HostLogo";
import type { CatalogRef } from "@/lib/catalogRef";
import { PickerListEmpty } from "@/models/PickerListEmpty";
import { PickerRowCheckbox } from "@/models/PickerRowCheckbox";
import { hostCheck } from "@/models/pickerCheckState";
import type { HostRow, PickerIndex } from "@/models/usePickerCatalog";
import { OptionRow } from "@/shared/OptionRow";

export function PickerHostList({
	hosts,
	index,
	refs,
	onToggle,
}: {
	hosts: HostRow[];
	index: PickerIndex;
	refs: CatalogRef[];
	onToggle: (h: HostRow) => void;
}) {
	if (hosts.length === 0) return <PickerListEmpty label="No hosts" />;
	return (
		<ul className="divide-y divide-border">
			{hosts.map((h) => {
				const { state, covered, total } = hostCheck(refs, h, index);
				return (
					<li key={h.id}>
						<OptionRow onClick={() => onToggle(h)} className="justify-between">
							<span className="flex items-center gap-2.5 min-w-0">
								<PickerRowCheckbox state={state} />
								<HostLogo host={h.logo} size={20} />
								<span className="min-w-0">
									<span className="text-sm text-foreground truncate block">
										{h.displayName}
									</span>
									<code className="text-[10px] font-mono text-muted-foreground">
										{h.name}
									</code>
								</span>
							</span>
							<span className="text-[11px] text-muted-foreground tabular-nums">
								{total === 0 ? "0 models" : `${covered}/${total}`}
							</span>
						</OptionRow>
					</li>
				);
			})}
		</ul>
	);
}
