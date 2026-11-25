import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import type { Model } from "@/api/types/model";
import { useMutability } from "@/hooks/useMutability";
import { displayLabel } from "@/lib/displayLabel";
import { ModelLogo } from "@/models/ModelLogo";
import { deprecationNote } from "@/models/modelDetail";
import { useModelReplacement } from "@/models/useModelReplacement";
import { BackLink } from "@/shared/BackLink";
import { logoSize } from "@/shared/CatalogIcon";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import {
	CatalogDetachedBadge,
	QuietBadge,
	StatusBadge,
} from "@/shared/StatusBadge";

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

	return (
		<DetailPageHeader
			back={<BackLink to="/models">Models</BackLink>}
			mark={<ModelLogo model={model} size={logoSize.header} />}
			metadata={model.metadata}
			badges={
				<>
					<StatusBadge enabled={enabled} />
					{deprecationNote(model) && <QuietBadge>Deprecated</QuietBadge>}
					<CatalogDetachedBadge detachedAt={model.metadata.catalogDetachedAt} />
				</>
			}
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

/** The deprecation warning, with the replacement model when the catalog names one. */
export function ModelDeprecationNotice({ model }: { model: Model }) {
	const dep = deprecationNote(model);
	const replacement = useModelReplacement(model);
	if (!dep) return null;
	return (
		<p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-meta text-warning">
			<AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
			<span>
				{dep}
				{replacement && (
					<>
						{" Replaced by "}
						<Link
							to="/models/$name"
							params={{ name: replacement.metadata.name }}
							className="font-medium underline"
						>
							{displayLabel(replacement.metadata)}
						</Link>
						.
					</>
				)}
			</span>
		</p>
	);
}
