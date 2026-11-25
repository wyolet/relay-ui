import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/shared/Chip";
import { SearchBox } from "@/shared/SearchBox";
import type { TargetModelOption } from "./useTargetModelOptions";
import { useTargetModelPicker } from "./useTargetModelPicker";

interface TargetModelsFieldProps {
	/** Selected model ids (PricingSpec.targetModels). */
	value: string[];
	onChange: (ids: string[]) => void;
	/** The owning host's id; its models list first. */
	hostId: string;
	/** The id of the field's error, when one shows. */
	errorId?: string;
}

/** Searchable checkbox list over registered models, the owning host's first. */
export function TargetModelsField({
	value,
	onChange,
	hostId,
	errorId,
}: TargetModelsFieldProps) {
	const { q, setQ, served, others, empty, labelOf } =
		useTargetModelPicker(hostId);

	const selected = new Set(value);
	function toggle(id: string) {
		onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
	}
	const split = hostId !== "";
	const nothingShown = served.length === 0 && others.length === 0;

	return (
		<div className="flex flex-col gap-2">
			{value.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{value.map((id) => (
						<Chip
							key={id}
							shape="box"
							label={labelOf(id)}
							onRemove={() => toggle(id)}
						/>
					))}
				</div>
			)}
			<SearchBox
				value={q}
				onChange={setQ}
				debounceMs={0}
				hotkey={false}
				placeholder="Search models"
			/>
			<fieldset
				aria-label="Target models"
				aria-describedby={errorId}
				className="max-h-56 min-w-0 overflow-y-auto rounded-md border border-border bg-card"
			>
				{nothingShown ? (
					<p className="px-3 py-4 text-center text-xs text-muted-foreground">
						{empty
							? "No models registered yet."
							: "No models match the search."}
					</p>
				) : (
					<ul className="divide-y divide-border">
						{split && served.length > 0 && (
							<OptionHeading>Served by this host</OptionHeading>
						)}
						{served.map((o) => (
							<OptionRow
								key={o.id}
								option={o}
								checked={selected.has(o.id)}
								onToggle={() => toggle(o.id)}
							/>
						))}
						{split && others.length > 0 && (
							<OptionHeading>Not served by this host</OptionHeading>
						)}
						{others.map((o) => (
							<OptionRow
								key={o.id}
								option={o}
								checked={selected.has(o.id)}
								onToggle={() => toggle(o.id)}
							/>
						))}
					</ul>
				)}
			</fieldset>
			<p className="text-[11px] text-muted-foreground">
				The owning host's bindings to these models get this rate sheet. At least
				one model is required.
			</p>
		</div>
	);
}

function OptionHeading({ children }: { children: string }) {
	return (
		<li className="sticky top-0 bg-muted px-3 py-1.5 text-foot font-medium text-ink-3">
			{children}
		</li>
	);
}

function OptionRow({
	option,
	checked,
	onToggle,
}: {
	option: TargetModelOption;
	checked: boolean;
	onToggle: () => void;
}) {
	return (
		<li>
			<label
				htmlFor={`target-model-${option.id}`}
				className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/40"
			>
				<Checkbox
					id={`target-model-${option.id}`}
					checked={checked}
					onCheckedChange={onToggle}
				/>
				<span className="min-w-0">
					<span className="block truncate text-xs text-foreground">
						{option.label}
					</span>
					<span className="block truncate font-mono text-[10px] text-muted-foreground">
						{option.slug}
					</span>
				</span>
			</label>
		</li>
	);
}
