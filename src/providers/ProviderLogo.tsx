import type { Provider } from "@/api/types/provider";
import { displayLabel } from "@/lib/displayLabel";
import { CatalogIcon } from "@/shared/CatalogIcon";

interface ProviderLogoProps {
	provider: Pick<Provider, "metadata" | "spec">;
	size?: number;
	className?: string;
	titleTooltip?: boolean;
}

/** Square logo for a provider, or its initial without one. */
export function ProviderLogo({
	provider,
	size,
	className,
	titleTooltip,
}: ProviderLogoProps) {
	return (
		<CatalogIcon
			path={provider.spec.icon?.path}
			label={displayLabel(provider.metadata)}
			size={size}
			className={className}
			titleTooltip={titleTooltip}
		/>
	);
}
