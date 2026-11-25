import { ExternalLink, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { components } from "@/api/types.gen";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { logoSize } from "@/shared/CatalogIcon";

type HeaderMetadata = Pick<
	components["schemas"]["Metadata"],
	"name" | "displayName" | "description"
>;

export interface HeaderLink {
	href: string | undefined;
	label: string;
}

/**
 * Detail-page header: an optional back link, then the mark (a logo, or an
 * icon tile of the same size), display name with badges, slug and description
 * on the left; `children` (the header actions) on the right.
 */
export function DetailPageHeader({
	back,
	icon: Icon,
	mark,
	metadata,
	badges,
	extra,
	links,
	children,
}: {
	/** A `BackLink`. */
	back?: ReactNode;
	/** Drawn in the tile when there is no `mark`. */
	icon?: LucideIcon;
	/** A logo sized `logoSize.header`, in place of the icon tile. */
	mark?: ReactNode;
	metadata: HeaderMetadata;
	/** Rendered after the title, inside the heading. */
	badges?: ReactNode;
	/** Lines between the slug and the description. */
	extra?: ReactNode;
	/** External pages, listed under the description; ones without `href` are skipped. */
	links?: HeaderLink[];
	children?: ReactNode;
}) {
	const description = metadata.description?.trim();
	const shownLinks = (links ?? []).filter((l) => l.href);
	return (
		<header className="mb-6 flex flex-col gap-2">
			{back}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
				<div className="min-w-0 flex items-start gap-3">
					{mark ?? (
						<div
							className="rounded-md bg-muted border border-border shrink-0 flex items-center justify-center"
							style={{ width: logoSize.header, height: logoSize.header }}
						>
							{Icon && (
								<Icon className="size-5 text-muted-foreground" aria-hidden />
							)}
						</div>
					)}
					<div className="min-w-0">
						<h1 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-bold text-foreground">
							<span className="min-w-0 truncate">{displayLabel(metadata)}</span>
							{!hasDisplayName(metadata) && (
								<span className="shrink-0 text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							{badges}
						</h1>
						<p className="truncate font-mono text-meta text-ink-2">
							{metadata.name}
						</p>
						{extra}
						{description && (
							<p className="mt-1.5 max-w-2xl text-label text-ink-2">
								{description}
							</p>
						)}
						{shownLinks.length > 0 && (
							<ul className="mt-2 flex flex-wrap gap-1.5">
								{shownLinks.map((l) => (
									<li key={l.label}>
										<a
											href={l.href}
											target="_blank"
											rel="noreferrer noopener"
											className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-border bg-card text-[11px] text-foreground hover:bg-muted transition-colors"
										>
											{l.label}
											<ExternalLink className="w-2.5 h-2.5 opacity-60" />
										</a>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
				{children}
			</div>
		</header>
	);
}
