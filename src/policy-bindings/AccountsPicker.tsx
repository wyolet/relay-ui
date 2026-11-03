import type { FilterOption } from "@/filters/types";
import type { UnavailablePicks } from "@/lib/workContext";
import { useAccountLabels } from "@/policy-bindings/useAccountLabels";
import { Chip } from "@/shared/Chip";
import { MultiSelect } from "@/shared/MultiSelect";
import { UnavailableChip } from "@/shared/ScopeNotes";

/** A binding's accounts as removable chips plus a searchable checklist to add more. */
export function AccountsPicker({
	options,
	selected,
	onChange,
	invalidId,
	describedBy,
	unavailable,
}: {
	options: readonly FilterOption[];
	selected: readonly string[];
	onChange: (next: string[]) => void;
	/** Id of an account the server refused. */
	invalidId?: string;
	describedBy?: string;
	/** Picked accounts the form's workspace can't use. */
	unavailable?: UnavailablePicks;
}) {
	const { labelOf } = useAccountLabels();

	function toggle(id: string) {
		onChange(
			selected.includes(id)
				? selected.filter((s) => s !== id)
				: [...selected, id],
		);
	}

	return (
		<fieldset
			aria-label="Accounts"
			aria-invalid={invalidId ? true : undefined}
			aria-describedby={describedBy}
			className="flex min-w-0 flex-col items-start gap-2 max-w-2xl"
		>
			{selected.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{selected.map((id) =>
						unavailable?.ids.includes(id) ? (
							<UnavailableChip
								key={id}
								label={labelOf(id).label}
								scope={unavailable.scope}
								onRemove={() => toggle(id)}
							/>
						) : (
							<Chip
								key={id}
								shape="box"
								label={labelOf(id).label}
								onRemove={() => toggle(id)}
								className={
									id === invalidId
										? "border-destructive text-destructive"
										: undefined
								}
							/>
						),
					)}
				</div>
			)}
			<MultiSelect
				label="Accounts"
				options={options}
				selected={selected}
				onToggle={toggle}
			/>
		</fieldset>
	);
}
