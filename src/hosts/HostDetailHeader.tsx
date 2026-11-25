import type { Host } from "@/api/types/host";
import { HostLogo } from "@/hosts/HostLogo";
import { useHostHeader } from "@/hosts/useHostHeader";
import { BackLink } from "@/shared/BackLink";
import { logoSize } from "@/shared/CatalogIcon";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import {
	CatalogDetachedBadge,
	OwnerBadge,
	StatusBadge,
} from "@/shared/StatusBadge";

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
		<DetailPageHeader
			back={
				<BackLink to="/models" search={{ host: host.metadata.name }}>
					Models
				</BackLink>
			}
			mark={<HostLogo host={host} size={logoSize.header} />}
			metadata={host.metadata}
			badges={
				<>
					<StatusBadge enabled={enabled} />
					{system && <OwnerBadge label="System" title="System-managed." />}
					<CatalogDetachedBadge detachedAt={host.metadata.catalogDetachedAt} />
				</>
			}
			links={links}
		>
			<DetailHeaderActions
				enabled={enabled}
				onToggle={onToggleEnabled}
				toggling={toggling}
				showToggle={canEdit}
				showDelete={canDelete}
				onDelete={onDelete}
				deleting={deleting}
			/>
		</DetailPageHeader>
	);
}
