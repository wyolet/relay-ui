import { AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { PickerIndex } from "@/models/usePickerCatalog";
import { usePickerRawDraft } from "@/models/usePickerRawDraft";

export function PickerRawEditor({
	value,
	onChange,
	index,
}: {
	value: string[];
	onChange: (next: string[]) => void;
	index: PickerIndex;
}) {
	const { draft, errors, edit } = usePickerRawDraft(value, onChange, index);

	return (
		<div className="flex flex-col gap-2 p-3">
			<div className="text-[11px] text-muted-foreground leading-relaxed">
				One ref per line. Examples:{" "}
				<code className="font-mono text-foreground/80">anthropic</code>,{" "}
				<code className="font-mono text-foreground/80">
					anthropic/claude-opus-4-7
				</code>
				, <code className="font-mono text-foreground/80">@bedrock</code>.
				<br />
				Refs are DNS-style slugs — not upstream model names. Replace{" "}
				<code className="font-mono text-foreground/80">.</code> and{" "}
				<code className="font-mono text-foreground/80">:</code> with{" "}
				<code className="font-mono text-foreground/80">-</code>.
			</div>
			<Textarea
				value={draft}
				onChange={(e) => edit(e.currentTarget.value)}
				spellCheck={false}
				rows={8}
				placeholder="anthropic&#10;openai/gpt-4o&#10;@bedrock"
				className="min-h-32 font-mono text-xs leading-relaxed"
			/>
			{errors.length > 0 && (
				<ul className="space-y-0.5 text-[11px]">
					{errors.map((e) => (
						<li
							key={`${e.idx}-${e.raw}`}
							className="flex items-start gap-1.5 text-destructive"
						>
							<AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
							<span>
								<span className="font-medium">Line {e.idx + 1}:</span>{" "}
								<code className="font-mono">{e.trimmed}</code> — {e.error}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
