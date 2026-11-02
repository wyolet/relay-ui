import { Link } from "@tanstack/react-router";
import { AlertTriangle, Boxes } from "lucide-react";
import type { Model } from "@/api/types/model";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { modelProductLine } from "@/models/groupModelsByFamily";
import { deprecationNote } from "@/models/modelDetail";
import { useModelMutability } from "@/models/useModelMutability";
import type { ModelProvider } from "@/models/useModelProvider";
import { ProviderLogo } from "@/providers/ProviderLogo";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import {
	CatalogDetachedBadge,
	OwnerBadge,
	StatusBadge,
} from "@/shared/StatusBadge";

export function ModelDetailHeader({
	model,
	provider,
	onToggleEnabled,
	onDelete,
	toggling,
	deleting,
}: {
	model: Model;
	provider: ModelProvider;
	onToggleEnabled: () => void;
	onDelete?: () => void;
	toggling?: boolean;
	deleting?: boolean;
}) {
	const enabled = model.spec.enabled !== false;
	const isProviderOwned = model.metadata.owner?.kind === "provider";
	const { canEdit, canDelete } = useModelMutability(model);
	const dep = deprecationNote(model);
	const productLine = modelProductLine(model);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					{provider.provider ? (
						<ProviderLogo
							provider={provider.provider}
							size={36}
							className="mt-0.5 shrink-0"
						/>
					) : (
						<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
							<Boxes className="w-4 h-4 text-muted-foreground" aria-hidden />
						</div>
					)}
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2 flex-wrap">
							{displayLabel(model.metadata)}
							{!hasDisplayName(model.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							<StatusBadge enabled={enabled} />
							{isProviderOwned && (
								<OwnerBadge label="Provider" title="Provider-owned." />
							)}
							<CatalogDetachedBadge
								detachedAt={model.metadata.catalogDetachedAt}
							/>
							{dep && (
								<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-warning/10 text-warning border border-warning/30">
									<AlertTriangle className="w-3 h-3" />
									Deprecated
								</span>
							)}
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{model.metadata.name}
						</p>
						<p className="mt-0.5 text-[11px] text-muted-foreground">
							{provider.providerSlug && (
								<>
									by{" "}
									<Link
										to="/providers/$name"
										params={{ name: provider.providerSlug }}
										className="text-foreground hover:underline"
									>
										{provider.provider
											? displayLabel(provider.provider.metadata)
											: provider.providerSlug}
									</Link>
								</>
							)}
							{model.spec.family && (
								<>
									{provider.providerSlug && (
										<span className="text-muted-foreground/50"> · </span>
									)}
									family{" "}
									<span className="text-foreground">{model.spec.family}</span>
									{model.spec.version && (
										<span className="text-foreground">
											{" "}
											{model.spec.version}
										</span>
									)}
								</>
							)}
							{productLine && (
								<>
									{(provider.providerSlug || model.spec.family) && (
										<span className="text-muted-foreground/50"> · </span>
									)}
									line <span className="text-foreground">{productLine}</span>
								</>
							)}
						</p>
						{model.metadata.description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
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
				<div className="flex items-start gap-2 px-3 py-2 rounded-md border border-warning/30 bg-warning/10 text-xs text-warning">
					<AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
					<span>{dep}</span>
				</div>
			)}
		</div>
	);
}
