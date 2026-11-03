import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, MoreHorizontal } from "lucide-react";
import { useMemo } from "react";
import { bindingsByModel, useBindings } from "@/api/hooks/bindings";
import { useDeleteModel, useUpdateModel } from "@/api/hooks/models";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlanIssueDot } from "@/diagnostics/DiagnosticDot";
import { useMutability } from "@/hooks/useMutability";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import type { ModelPriceSummary } from "@/lib/pricingMatrix";
import { ModelPrice } from "@/pricing/ModelPrice";
import type { ModelPrices } from "@/pricing/useModelPrices";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { CatalogDetachedBadge } from "@/shared/StatusBadge";
import { Switch } from "@/shared/Switch";
import { Th } from "@/shared/Th";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

// Name sorts server-side (GET /models?sort=); price has no server sort, so
// the page sorts the full filtered set by it and windows it client-side.
export type ModelsSortKey = "name" | "price";
export type ModelsSortDir = "asc" | "desc";

function deprecationNote(m: Model): string | null {
	const d = m.spec.deprecation;
	const date = m.spec.deprecationDate;
	if (!d && !date) return null;
	const parts: string[] = [];
	if (d?.status) parts.push(d.status);
	if (d?.sunsetDate) parts.push(`sunsets ${d.sunsetDate}`);
	else if (date) parts.push(`deprecated ${date}`);
	if (d?.replacement) parts.push(`→ ${d.replacement}`);
	return parts.join(" · ") || null;
}

function RowMenu({
	name,
	canEdit,
	canDelete,
	onDelete,
}: {
	name: string;
	canEdit: boolean;
	canDelete: boolean;
	onDelete: () => void;
}) {
	const navigate = useNavigate();
	if (!canEdit && !canDelete) {
		return (
			<span
				className="text-[10px] uppercase tracking-wide text-muted-foreground"
				title="Provider-managed — synced from the catalog"
			>
				managed
			</span>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Model actions"
				className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<MoreHorizontal className="w-3.5 h-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-[160px]">
				{canEdit && (
					<DropdownMenuItem
						onClick={() =>
							navigate({ to: "/models/$name/edit", params: { name } })
						}
					>
						Edit
					</DropdownMenuItem>
				)}
				{canDelete && (
					<DropdownMenuItem variant="destructive" onClick={onDelete}>
						Delete
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function HostBadges({
	hostIds,
	hostsById,
}: {
	hostIds: readonly string[];
	hostsById?: Map<string, Host>;
}) {
	if (hostIds.length === 0 || !hostsById) return null;
	const seen = new Set<string>();
	const hosts: Host[] = [];
	for (const hostId of hostIds) {
		if (seen.has(hostId)) continue;
		const h = hostsById.get(hostId);
		if (!h) continue;
		seen.add(hostId);
		hosts.push(h);
	}
	if (hosts.length === 0) return null;
	return (
		<span className="inline-flex items-center gap-1">
			{hosts.map((h) => (
				<HostLogo
					key={h.metadata.id ?? h.metadata.name}
					host={h}
					size={28}
					titleTooltip
					className="opacity-90"
				/>
			))}
		</span>
	);
}

function ModelRow({
	m,
	hideProvider,
	hostsById,
	hostIds,
	price,
	onDelete,
}: {
	m: Model;
	hideProvider?: boolean;
	hostsById?: Map<string, Host>;
	hostIds: readonly string[];
	price: ModelPriceSummary | undefined;
	onDelete: () => void;
}) {
	const enabled = m.spec.enabled !== false;
	const updateModel = useUpdateModel();
	const toastSaveError = useSaveErrorToast();
	const { canEdit, canDelete } = useMutability(m.metadata, "model");
	async function toggleEnabled(next: boolean) {
		try {
			await updateModel.mutateAsync({
				id: m.metadata.id ?? "",
				body: { metadata: m.metadata, spec: { ...m.spec, enabled: next } },
			});
		} catch (err) {
			toastSaveError(err, "Failed to update model.");
		}
	}
	const dep = deprecationNote(m);

	return (
		<tr className="border-t border-border hover:bg-muted/40 transition-colors">
			<td className="px-3 py-2">
				<Link
					to="/models/$name"
					params={{ name: m.metadata.name }}
					className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-sm font-medium text-foreground truncate">
							{displayLabel(m.metadata)}
						</span>
						{dep && (
							<AlertTriangle
								className="w-3.5 h-3.5 text-warning shrink-0"
								aria-label={dep}
							/>
						)}
						<PlanIssueDot kind="model" id={m.metadata.id} />
						<CatalogDetachedBadge detachedAt={m.metadata.catalogDetachedAt} />
					</div>
					{(hasDisplayName(m.metadata) || dep) && (
						<div className="text-[11px] text-muted-foreground truncate">
							{dep ? (
								<span className="text-warning">{dep}</span>
							) : (
								<code className="font-mono">{m.metadata.name}</code>
							)}
						</div>
					)}
				</Link>
			</td>
			{!hideProvider && (
				<td className="px-3 py-2 text-sm text-foreground">
					<HostBadges hostIds={hostIds} hostsById={hostsById} />
				</td>
			)}
			<td className="px-3 py-2 text-right">
				{m.metadata.id && (
					<ModelPrice modelId={m.metadata.id} summary={price} />
				)}
			</td>
			<td className="px-3 py-2">
				{canEdit ? (
					<Switch
						checked={enabled}
						onChange={(next) => void toggleEnabled(next)}
						disabled={updateModel.isPending}
						label={`Toggle ${m.metadata.name}`}
					/>
				) : (
					<span
						className={[
							"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
							enabled
								? "bg-success-soft text-success border-success/30"
								: "bg-muted text-muted-foreground border-border",
						].join(" ")}
						title="Provider-managed — toggle from the provider instead"
					>
						{enabled ? "On" : "Off"}
					</span>
				)}
			</td>
			<td className="px-3 py-2 text-right">
				<RowMenu
					name={m.metadata.name}
					canEdit={canEdit}
					canDelete={canDelete}
					onDelete={onDelete}
				/>
			</td>
		</tr>
	);
}

interface ModelsTableProps {
	items: readonly Model[];
	sort: ModelsSortKey;
	dir: ModelsSortDir;
	onSort: (field: ModelsSortKey) => void;
	hideProvider?: boolean;
	hostsById?: Map<string, Host>;
	prices: ModelPrices | undefined;
}

export function ModelsTable({
	items,
	sort,
	dir,
	onSort,
	hideProvider,
	hostsById,
	prices,
}: ModelsTableProps) {
	const { data: bindingsData } = useBindings();
	const del = useConfirmedDelete(useDeleteModel(), { noun: "model" });
	const hostIdsByModel = useMemo(() => {
		const byModel = bindingsByModel(bindingsData.items ?? []);
		const out = new Map<string, string[]>();
		for (const [modelId, list] of byModel) {
			out.set(
				modelId,
				list.map((b) => b.spec.hostId),
			);
		}
		return out;
	}, [bindingsData]);
	return (
		<>
			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full border-collapse">
					<thead className="bg-muted/40">
						<tr>
							<Th
								variant="column"
								sort={{
									active: sort === "name",
									direction: dir,
									onSort: () => onSort("name"),
								}}
							>
								Name
							</Th>
							{!hideProvider && <Th variant="column">Hosts</Th>}
							<Th
								variant="column"
								align="right"
								sort={{
									active: sort === "price",
									direction: dir,
									onSort: () => onSort("price"),
								}}
							>
								Price
							</Th>
							<th
								scope="col"
								className="w-12 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
							>
								On
							</th>
							<th scope="col" className="w-10 px-3 py-2" aria-label="Actions" />
						</tr>
					</thead>
					<tbody>
						{items.map((m) => (
							<ModelRow
								key={m.metadata.name}
								m={m}
								hideProvider={hideProvider}
								hostsById={hostsById}
								hostIds={hostIdsByModel.get(m.metadata.id ?? "") ?? []}
								price={prices?.get(m.metadata.id ?? "")}
								onDelete={() =>
									del.request({
										id: m.metadata.id ?? "",
										name: m.metadata.name,
										label: displayLabel(m.metadata),
									})
								}
							/>
						))}
					</tbody>
				</table>
			</div>
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</>
	);
}
