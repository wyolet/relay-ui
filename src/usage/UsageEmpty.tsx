import type { LucideIcon } from "lucide-react";

/**
 * Dashed-box empty state for the usage views — matches the `EmptyState`
 * markup used in the host/model detail tabs (no CTA; usage is read-only).
 */
export function UsageEmpty({
	icon: Icon,
	title,
	body,
}: {
	icon: LucideIcon;
	title: string;
	body: string;
}) {
	return (
		<div className="rounded-md border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
			<Icon
				className="mx-auto w-6 h-6 text-muted-foreground/60 mb-2"
				aria-hidden
			/>
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
				{body}
			</div>
		</div>
	);
}
