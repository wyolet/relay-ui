import { X } from "lucide-react";
import { useState } from "react";
import { SearchBox } from "@/shared/SearchBox";
import {
	type TargetModelOption,
	useTargetModelOptions,
} from "./useTargetModelOptions";

interface TargetModelsFieldProps {
	/** Selected model ids (PricingSpec.targetModels). */
	value: string[];
	onChange: (ids: string[]) => void;
}

/**
 * Searchable checkbox list over registered models. An empty selection means
 * the pricing applies to whichever bindings reference it, unscoped.
 */
export function TargetModelsField({ value, onChange }: TargetModelsFieldProps) {
	const options = useTargetModelOptions();
	const [q, setQ] = useState("");

	const selected = new Set(value);
	const needle = q.trim().toLowerCase();
	const visible = needle
		? options.filter(
				(o) =>
					o.label.toLowerCase().includes(needle) ||
					o.slug.toLowerCase().includes(needle),
			)
		: options;

	function toggle(id: string) {
		onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
	}

	const labelOf = (id: string): string =>
		options.find((o) => o.id === id)?.label ?? id;

	return (
		<div className="flex flex-col gap-2">
			{value.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{value.map((id) => (
						<span
							key={id}
							className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-foreground"
						>
							{labelOf(id)}
							<button
								type="button"
								onClick={() => toggle(id)}
								aria-label={`Remove ${labelOf(id)}`}
								className="text-muted-foreground hover:text-destructive"
							>
								<X className="w-3 h-3" />
							</button>
						</span>
					))}
				</div>
			)}
			<SearchBox value={q} onChange={setQ} placeholder="Search models" />
			<div className="max-h-56 overflow-y-auto rounded-md border border-border bg-card">
				{visible.length === 0 ? (
					<p className="px-3 py-4 text-center text-xs text-muted-foreground">
						{options.length === 0
							? "No models registered yet."
							: "No models match the search."}
					</p>
				) : (
					<ul className="divide-y divide-border">
						{visible.map((o) => (
							<OptionRow
								key={o.id}
								option={o}
								checked={selected.has(o.id)}
								onToggle={() => toggle(o.id)}
							/>
						))}
					</ul>
				)}
			</div>
			<p className="text-[11px] text-muted-foreground">
				The owning host's bindings to these models get this rate sheet. At least
				one model is required.
			</p>
		</div>
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
			<label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/40">
				<input
					type="checkbox"
					checked={checked}
					onChange={onToggle}
					className="accent-primary"
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
