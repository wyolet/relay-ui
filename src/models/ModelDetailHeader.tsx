import { AlertTriangle } from "lucide-react";
import type { Model } from "@/api/types/model";
import { useMutability } from "@/hooks/useMutability";
import { displayLabel } from "@/lib/displayLabel";
import { ModelLogo } from "@/models/ModelLogo";
import { deprecationNote } from "@/models/modelDetail";
import { logoSize } from "@/shared/CatalogIcon";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { CatalogDetachedBadge, QuietBadge } from "@/shared/StatusBadge";

export function ModelDetailHeader({
	model,
	onToggleEnabled,
	onDelete,
	toggling,
	deleting,
}: {
	model: Model;
	onToggleEnabled: () => void;
	onDelete?: () => void;
	toggling?: boolean;
	deleting?: boolean;
}) {
	const enabled = model.spec.enabled !== false;
	const { canEdit, canDelete } = useMutability(model.metadata, "model");
	const dep = deprecationNote(model);

	return (
		<header className="grid grid-cols-1 gap-3">
			<div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
				<div className="flex min-w-0 items-start gap-3">
					<ModelLogo model={model} size={logoSize.header} />
					<div className="grid min-w-0 gap-1">
						<h1 className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-2xl font-bold text-foreground">
							<span className="truncate">{displayLabel(model.metadata)}</span>
							<QuietBadge>{enabled ? "Enabled" : "Disabled"}</QuietBadge>
							{dep && <QuietBadge>Deprecated</QuietBadge>}
							<CatalogDetachedBadge
								detachedAt={model.metadata.catalogDetachedAt}
							/>
						</h1>
						<code className="truncate font-mono text-meta text-ink-2">
							{model.metadata.name}
						</code>
						{model.metadata.description && (
							<p className="max-w-2xl text-label text-ink-2">
								{model.metadata.description}
							</p>
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
			{dep && (
				<p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-meta text-warning">
					<AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
					{dep}
				</p>
			)}
		</header>
	);
}
