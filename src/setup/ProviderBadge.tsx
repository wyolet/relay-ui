import type { Host } from "@/api/types/host";
import { HostLogo } from "@/hosts/HostLogo";
import type { ProviderDef } from "./providerCatalog";

interface ProviderBadgeProps {
	def: ProviderDef;
	host: Host | undefined;
	/** Tile edge length in px. */
	size?: number;
}

/**
 * Square brand tile for a provider. Prefers the seeded host's real icon
 * (`spec.icon.path` via {@link HostLogo}); falls back to the colored monogram
 * when the host isn't seeded or ships no icon.
 */
export function ProviderBadge({ def, host, size = 44 }: ProviderBadgeProps) {
	const hasIcon = Boolean(host?.spec.icon?.path);
	const style = { width: size, height: size } as const;

	if (host && hasIcon) {
		// No tile — just ease the icon off the very edges.
		return (
			<span className="flex shrink-0 items-center justify-center" style={style}>
				<HostLogo host={host} size={Math.round(size * 0.88)} />
			</span>
		);
	}

	return (
		<span
			className={`flex shrink-0 items-center justify-center rounded-lg font-bold ${def.badgeClass}`}
			style={{ ...style, fontSize: Math.round(size * 0.4) }}
		>
			{def.monogram}
		</span>
	);
}
