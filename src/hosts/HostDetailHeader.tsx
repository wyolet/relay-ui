import { ExternalLink } from "lucide-react";
import type { Host } from "@/api/types/host";
import { HostLogo } from "@/hosts/HostLogo";
import { useHostHeader } from "@/hosts/useHostHeader";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import {
	CatalogDetachedBadge,
	OwnerBadge,
	StatusBadge,
} from "@/shared/StatusBadge";

// Not DetailPageHeader: the host shows its logo where that header has an icon tile.
export function HostDetailHeader({
	host,
	onToggleEnabled,
	toggling,
	onDelete,
	deleting,
}: {
	host: Host;
	onToggleEnabled: () => void;
	toggling?: boolean;
	onDelete: () => void;
	deleting?: boolean;
}) {
	const { enabled, system, canEdit, canDelete, links } = useHostHeader(host);

	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0 flex items-start gap-3">
				<HostLogo host={host} size={44} className="mt-0.5 shrink-0" />
				<div className="min-w-0">
					<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
						{displayLabel(host.metadata)}
						{!hasDisplayName(host.metadata) && (
							<span className="text-[11px] text-muted-foreground font-normal">
								(no display name)
							</span>
						)}
						<StatusBadge enabled={enabled} />
						{system && <OwnerBadge label="System" title="System-managed." />}
						<CatalogDetachedBadge
							detachedAt={host.metadata.catalogDetachedAt}
						/>
					</h1>
					<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
						{host.metadata.name}
					</p>
					{host.metadata.description && (
						<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
							{host.metadata.description}
						</p>
					)}
					{links.length > 0 && (
						<ul className="mt-2 flex flex-wrap gap-1.5">
							{links.map((l) => (
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
			<DetailHeaderActions
				enabled={enabled}
				onToggle={onToggleEnabled}
				toggling={toggling}
				showToggle={canEdit}
				showDelete={canDelete}
				onDelete={onDelete}
				deleting={deleting}
			/>
		</div>
	);
}
