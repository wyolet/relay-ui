import { displayLabel } from "@/lib/displayLabel";
import { CatalogIcon } from "@/shared/CatalogIcon";

/** Only the fields the logo actually reads — full `Host` and compact graph
 * host rows both satisfy this. */
export interface HostLogoLike {
	metadata: { name: string; displayName?: string };
	spec: { icon?: { path?: string } };
}

/** Adapt a flat `HostRef` (the shape sub-endpoints return) to {@link HostLogoLike}. */
export function hostRefLogo(host: {
	name: string;
	displayName?: string;
	icon?: { path?: string };
}): HostLogoLike {
	return {
		metadata: { name: host.name, displayName: host.displayName },
		spec: { icon: host.icon },
	};
}

interface HostLogoProps {
	host: HostLogoLike;
	size?: number;
	className?: string;
	/** When true, the host label is set as a `title` for native tooltips. */
	titleTooltip?: boolean;
}

/** Square logo for a host, or its initial without one. */
export function HostLogo({
	host,
	size,
	className,
	titleTooltip,
}: HostLogoProps) {
	return (
		<CatalogIcon
			path={host.spec.icon?.path}
			label={displayLabel(host.metadata)}
			size={size}
			className={className}
			titleTooltip={titleTooltip}
		/>
	);
}
