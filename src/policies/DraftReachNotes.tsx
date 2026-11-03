import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExcludedRow } from "@/policies/policyReach";

/**
 * Under the models picker: why it isn't narrowed to the reach, which bound
 * account it was checked for, and the models the reach can't serve.
 */
export function DraftReachNotes({
	note,
	accountNote,
	excluded,
}: {
	note: string | undefined;
	accountNote: string | undefined;
	excluded: readonly ExcludedRow[];
}) {
	const [showExcluded, setShowExcluded] = useState(false);
	if (!note && !accountNote && excluded.length === 0) return null;
	return (
		<div className="mt-2 flex flex-col gap-1.5">
			{note && (
				<p role="status" className="text-[11px] text-muted-foreground">
					{note}
				</p>
			)}
			{accountNote && (
				<p className="text-[11px] text-muted-foreground">{accountNote}</p>
			)}
			{excluded.length > 0 && (
				<>
					<Button
						type="button"
						variant="link"
						size="inline"
						className="self-start text-muted-foreground"
						aria-expanded={showExcluded}
						onClick={() => setShowExcluded((v) => !v)}
					>
						<ChevronRight
							className={cn(
								"w-3 h-3 transition-transform",
								showExcluded && "rotate-90",
							)}
							aria-hidden="true"
						/>
						{`${showExcluded ? "Hide" : "Show"} models this reach can't serve (${excluded.length})`}
					</Button>
					{showExcluded && (
						<ul className="rounded-md border border-border bg-card divide-y divide-border">
							{excluded.map((e) => (
								<li key={e.id} className="px-3 py-2">
									<div className="flex items-baseline gap-2 min-w-0">
										<span className="truncate text-sm text-foreground">
											{e.label}
										</span>
										<code className="truncate text-[10px] font-mono text-muted-foreground">
											{e.ref}
										</code>
									</div>
									<p className="text-[11px] text-muted-foreground">
										{e.reason}
									</p>
								</li>
							))}
						</ul>
					)}
				</>
			)}
		</div>
	);
}
