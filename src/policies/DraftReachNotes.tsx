import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExcludedRow } from "@/policies/policyReach";

/**
 * Under the models picker: why it isn't narrowed to what the credentials
 * serve, which bound account it was checked for, and the models they can't serve.
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
						className="self-start text-[11px] text-muted-foreground"
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
						{excluded.length === 1
							? "1 model isn't available here"
							: `${excluded.length} models aren't available here`}
					</Button>
					{showExcluded && (
						<ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-card divide-y divide-border">
							{excluded.map((e) => (
								<li
									key={e.id}
									className="flex items-baseline gap-2 px-3 py-1.5 text-[11px]"
								>
									<span className="shrink-0 text-foreground">{e.label}</span>
									<span
										className="min-w-0 truncate text-muted-foreground"
										title={e.reason}
									>
										{e.reason}
									</span>
								</li>
							))}
						</ul>
					)}
				</>
			)}
		</div>
	);
}
