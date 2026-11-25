import { Link } from "@tanstack/react-router";
import type { Model } from "@/api/types/model";
import { PlanIssueDot } from "@/diagnostics/DiagnosticDot";
import { displayLabel } from "@/lib/displayLabel";
import { isDeprecatedModel } from "@/lib/modelsByHost";
import { ModelLogo } from "@/models/ModelLogo";
import { logoSize } from "@/shared/CatalogIcon";
import { QuietTag } from "@/shared/LineGrid";

/** A model row's lead cell: logo, linked name, and the slug with its
 * off/deprecated tags, which ride the slug line so the name keeps its width. */
export function ModelNameCell({
	model,
	enabled,
}: {
	model: Model;
	enabled: boolean;
}) {
	const label = displayLabel(model.metadata);
	return (
		<span className="flex min-w-0 items-center gap-2.5">
			<ModelLogo model={model} size={logoSize.stacked} />
			<span className="grid min-w-0">
				<span className="flex min-w-0 items-center gap-2">
					<Link
						to="/models/$name"
						params={{ name: model.metadata.name }}
						className="truncate text-foreground hover:underline"
						title={label}
					>
						{label}
					</Link>
					<PlanIssueDot kind="model" id={model.metadata.id} />
				</span>
				<span className="flex min-w-0 items-baseline gap-2">
					<code
						className="truncate font-mono text-foot text-ink-3"
						title={model.metadata.name}
					>
						{model.metadata.name}
					</code>
					{!enabled && <QuietTag>off</QuietTag>}
					{isDeprecatedModel(model) && <QuietTag>deprecated</QuietTag>}
				</span>
			</span>
		</span>
	);
}
