import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";

/** One editable label. `id` exists only to key the rows while the key
 * field is still being typed (and may be empty or duplicated). */
export interface LabelPair {
	id: string;
	key: string;
	value: string;
}

export function newLabelPair(key = "", value = ""): LabelPair {
	return { id: crypto.randomUUID(), key, value };
}

export function toLabelPairs(
	labels: Record<string, string> | undefined,
): LabelPair[] {
	return Object.entries(labels ?? {}).map(([k, v]) => newLabelPair(k, v));
}

/** Drops incomplete rows; a later duplicate key wins, as in an object literal. */
export function fromLabelPairs(pairs: LabelPair[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const p of pairs) {
		const key = p.key.trim();
		if (key) out[key] = p.value.trim();
	}
	return out;
}

export function LabelsEditor({
	pairs,
	onChange,
}: {
	pairs: LabelPair[];
	onChange: (next: LabelPair[]) => void;
}) {
	function patch(id: string, field: "key" | "value", v: string) {
		onChange(pairs.map((p) => (p.id === id ? { ...p, [field]: v } : p)));
	}

	return (
		<div className="flex flex-col gap-2 max-w-md">
			{pairs.map((p) => (
				<div key={p.id} className="flex items-center gap-2">
					<Input
						type="text"
						value={p.key}
						onChange={(e) => patch(p.id, "key", e.currentTarget.value)}
						placeholder="cost-center"
						aria-label="Label key"
					/>
					<Input
						type="text"
						value={p.value}
						onChange={(e) => patch(p.id, "value", e.currentTarget.value)}
						placeholder="1042"
						aria-label="Label value"
					/>
					<IconButton
						icon={X}
						label={`Remove label ${p.key || "(empty)"}`}
						onClick={() => onChange(pairs.filter((x) => x.id !== p.id))}
					/>
				</div>
			))}
			<div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onChange([...pairs, newLabelPair()])}
				>
					<Plus className="w-3.5 h-3.5" />
					Add label
				</Button>
			</div>
		</div>
	);
}
