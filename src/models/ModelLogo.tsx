import type { components } from "@/api/types.gen";
import type { Model } from "@/api/types/model";
import { displayLabel } from "@/lib/displayLabel";
import { useModelIconPath } from "@/models/useModelProvider";
import { CatalogIcon } from "@/shared/CatalogIcon";

interface LogoProps {
	size?: number;
	className?: string;
}

/** Square logo for a model resource: its own, else its provider's, else its initial. */
export function ModelLogo({
	model,
	size,
	className,
}: LogoProps & { model: Model }) {
	return (
		<CatalogIcon
			path={useModelIconPath(model)}
			label={displayLabel(model.metadata)}
			size={size}
			className={className}
		/>
	);
}

/** Square logo for a model view ref, whose icon the server already resolved. */
export function ModelRefLogo({
	model,
	size,
	className,
}: LogoProps & { model: components["schemas"]["ModelRef"] }) {
	return (
		<CatalogIcon
			path={model.icon?.path}
			label={displayLabel(model)}
			size={size}
			className={className}
		/>
	);
}
