import { Link } from "@tanstack/react-router";
import { AlertTriangle, Boxes } from "lucide-react";
import type { Model } from "@/api/types/model";
import { useMutability } from "@/hooks/useMutability";
import { displayLabel } from "@/lib/displayLabel";
import { fmtReleaseMonth } from "@/lib/modelsByHost";
import { modelProductLine } from "@/models/groupModelsByFamily";
import { deprecationNote, familyLabel } from "@/models/modelDetail";
import type { ModelProvider } from "@/models/useModelProvider";
import { ProviderLogo } from "@/providers/ProviderLogo";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { CatalogDetachedBadge, QuietBadge } from "@/shared/StatusBadge";

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
	const { canEdit, canDelete } = useMutability(model.metadata, "model");
	const dep = deprecationNote(model);
	const productLine = modelProductLine(model);
	const lineage = productLine ? `${productLine} line` : familyLabel(model);
	const released = fmtReleaseMonth(model.spec.releaseDate);

	return (
		<header className="grid grid-cols-1 gap-3">
			<div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
				<div className="flex min-w-0 items-start gap-3">
					{provider.provider ? (
						<ProviderLogo
							provider={provider.provider}
							size={36}
							className="mt-0.5 shrink-0"
						/>
					) : (
						<span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
							<Boxes className="size-4 text-ink-3" aria-hidden />
						</span>
					)}
					<div className="grid min-w-0 gap-1">
						<h1 className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-2xl font-bold text-foreground">
							<span className="truncate">{displayLabel(model.metadata)}</span>
							<QuietBadge>{enabled ? "Enabled" : "Disabled"}</QuietBadge>
							{dep && <QuietBadge>Deprecated</QuietBadge>}
							<CatalogDetachedBadge
								detachedAt={model.metadata.catalogDetachedAt}
							/>
						</h1>
						<p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-meta text-ink-3">
							<code className="truncate font-mono text-ink-2">
								{model.metadata.name}
							</code>
							{provider.providerSlug && (
								<>
									<span aria-hidden>·</span>
									<Link
										to="/providers/$name"
										params={{ name: provider.providerSlug }}
										className="text-ink-2 hover:text-foreground hover:underline"
									>
										{provider.provider
											? displayLabel(provider.provider.metadata)
											: provider.providerSlug}
									</Link>
								</>
							)}
							{lineage && (
								<>
									<span aria-hidden>·</span>
									<span>{lineage}</span>
								</>
							)}
							{released && (
								<>
									<span aria-hidden>·</span>
									<span>released {released}</span>
								</>
							)}
						</p>
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
