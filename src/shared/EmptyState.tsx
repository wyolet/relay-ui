import type { LucideIcon } from "lucide-react";

/** Dashed placeholder for a detail tab with nothing to list; `comingSoon`
 * adds the tag. */
export function EmptyState({
	icon: Icon,
	title,
	body,
	comingSoon,
}: {
	icon: LucideIcon;
	title: string;
	body: string;
	comingSoon?: boolean;
}) {
	return (
		<div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
			<Icon
				className="mx-auto w-6 h-6 text-muted-foreground/60 mb-2"
				aria-hidden
			/>
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
				{body}
			</div>
			{comingSoon && (
				<div className="mt-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border uppercase tracking-wide">
					Coming soon
				</div>
			)}
		</div>
	);
}
