import { ChevronLeft } from "lucide-react";
import type { ShortcutTargetKind } from "@/shortcuts/registry";
import { TargetLink } from "@/shortcuts/TargetLink";

/** A shortcut form's head: the way back to its target, the title, and what it does. */
export function ShortcutHeader({
	kind,
	name,
	back,
	title,
	description,
}: {
	kind: ShortcutTargetKind | undefined;
	name?: string;
	back: string;
	title: string;
	description: string;
}) {
	return (
		<div>
			<TargetLink
				kind={kind}
				name={name}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				{back}
			</TargetLink>
			<h1 className="mt-2 text-xl font-semibold text-foreground">{title}</h1>
			<p className="mt-1 text-xs text-muted-foreground">{description}</p>
		</div>
	);
}
