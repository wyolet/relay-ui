import type { FilterOption } from "@/filters/types";
import type { UnavailablePicks } from "@/lib/workContext";
import { AccountChipLabel } from "@/policy-bindings/AccountChips";
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
	invalid,
	describedBy,
	unavailable,
}: {
	options: readonly FilterOption[];
	selected: readonly string[];
	onChange: (next: string[]) => void;
	/** Id of an account the server refused. */
	invalidId?: string;
	/** The field as a whole has an error, such as no account picked. */
	invalid?: boolean;
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
								label={<AccountChipLabel account={labelOf(id)} link={false} />}
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
				invalid={invalid}
				describedBy={describedBy}
			/>
		</fieldset>
	);
}
