import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { components } from "@/api/types.gen";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

type HeaderMetadata = Pick<
	components["schemas"]["Metadata"],
	"name" | "displayName" | "description"
>;

/**
 * Detail-page header: icon tile, display name with badges, slug and
 * description on the left; `children` (the header actions) on the right.
 */
export function DetailPageHeader({
	icon: Icon,
	metadata,
	badges,
	extra,
	children,
}: {
	icon: LucideIcon;
	metadata: HeaderMetadata;
	/** Rendered after the title, inside the heading. */
	badges?: ReactNode;
	/** Lines between the slug and the description. */
	extra?: ReactNode;
	children?: ReactNode;
}) {
	const description = metadata.description?.trim();
	return (
		<header className="flex items-start justify-between gap-4">
			<div className="min-w-0 flex items-start gap-3">
				<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
					<Icon className="w-4 h-4 text-muted-foreground" aria-hidden />
				</div>
				<div className="min-w-0">
					<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
						{displayLabel(metadata)}
						{!hasDisplayName(metadata) && (
							<span className="text-[11px] text-muted-foreground font-normal">
								(no display name)
							</span>
						)}
						{badges}
					</h1>
					<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
						{metadata.name}
					</p>
					{extra}
					{description && (
						<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
							{description}
						</p>
					)}
				</div>
			</div>
			{children}
		</header>
	);
}
