import { Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	MoreHorizontal,
} from "lucide-react";
import { useGovernance } from "@/api/hooks/governance";
import { useDeleteModel, useUpdateModel } from "@/api/hooks/models";
import { ApiError } from "@/api/types/errors";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import { useModelDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { resolveMutability } from "@/lib/ownership";
import { confirm } from "@/shared/ConfirmDialog";
import { Switch } from "@/shared/Switch";
import { toast } from "@/shared/Toast";

export type ModelsSortKey = "name" | "provider";
export type ModelsSortDir = "asc" | "desc";

export const MODEL_SORT_KEYS = ["name", "provider"] as const;

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

function providerIdOf(m: Model): string {
	return m.metadata.owner?.kind === "provider"
		? (m.metadata.owner.id ?? "")
		: "";
}

function providerOf(m: Model, slugById?: Map<string, string>): string {
	const id = providerIdOf(m);
	if (!id) return "";
	return slugById?.get(id) ?? id;
}

function sortValue(
	m: Model,
	key: ModelsSortKey,
	slugById?: Map<string, string>,
): string | number {
	switch (key) {
		case "name":
			return displayLabel(m.metadata).toLowerCase();
		case "provider":
			return providerOf(m, slugById).toLowerCase();
	}
}

export type ModelDeprecatedFilter = "active" | "deprecated" | "all";

function isDeprecated(m: Model): boolean {
	return Boolean(m.spec.deprecation || m.spec.deprecationDate);
}

export function applyModelFilter(
	items: Model[],
	q: string,
	deprecated: ModelDeprecatedFilter,
	slugById?: Map<string, string>,
): Model[] {
	const ql = q.trim().toLowerCase();
	return items.filter((m) => {
		const dep = isDeprecated(m);
		if (deprecated === "active" && dep) return false;
		if (deprecated === "deprecated" && !dep) return false;
		if (!ql) return true;
		const snapshotNames = (m.spec.snapshots ?? []).flatMap((s) =>
			[s.name, s.originalName].filter((v): v is string => Boolean(v)),
		);
		const hay = [
			m.metadata.name,
			m.metadata.displayName,
			m.spec.family,
			providerOf(m, slugById),
			...snapshotNames,
			...(m.spec.tags ?? []),
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		return hay.includes(ql);
	});
}

export function applyModelSort(
	items: Model[],
	key: ModelsSortKey,
	dir: ModelsSortDir,
	slugById?: Map<string, string>,
): Model[] {
	const sorted = [...items].sort((a, b) => {
		const av = sortValue(a, key, slugById);
		const bv = sortValue(b, key, slugById);
		if (typeof av === "number" && typeof bv === "number") return av - bv;
		return String(av).localeCompare(String(bv), undefined, { numeric: true });
	});
	return dir === "asc" ? sorted : sorted.reverse();
}

interface SortHeaderProps {
	label: string;
	field: ModelsSortKey;
	current: ModelsSortKey;
	dir: ModelsSortDir;
	onClick: (field: ModelsSortKey) => void;
	align?: "left" | "right";
}

function SortHeader({
	label,
	field,
	current,
	dir,
	onClick,
	align = "left",
}: SortHeaderProps) {
	const active = current === field;
	const Icon = dir === "asc" ? ArrowUp : ArrowDown;
	return (
		<th
			scope="col"
			className={[
				"px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
				align === "right" ? "text-right" : "text-left",
			].join(" ")}
		>
			<button
				type="button"
				onClick={() => onClick(field)}
				className={[
					"inline-flex items-center gap-1 transition-colors",
					align === "right" ? "flex-row-reverse" : "",
					active ? "text-foreground" : "hover:text-foreground",
				].join(" ")}
			>
				{label}
				{active && <Icon className="w-3 h-3" aria-hidden="true" />}
			</button>
		</th>
	);
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
	m,
	hostsById,
}: {
	m: Model;
	hostsById?: Map<string, Host>;
}) {
	const bindings = m.spec.hosts ?? [];
	if (bindings.length === 0 || !hostsById) return null;
	const seen = new Set<string>();
	const hosts: Host[] = [];
	for (const b of bindings) {
		if (seen.has(b.hostId)) continue;
		const h = hostsById.get(b.hostId);
		if (!h) continue;
		seen.add(b.hostId);
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
}: {
	m: Model;
	hideProvider?: boolean;
	hostsById?: Map<string, Host>;
}) {
	const enabled = m.spec.enabled !== false;
	const updateModel = useUpdateModel(m.metadata.id ?? "");
	const deleteModel = useDeleteModel();
	const diagnostics = useModelDiagnostics(m.metadata.id);
	const gov = useGovernance("model");
	const { canEdit, canDelete } = resolveMutability(m.metadata.owner?.kind, gov);
	async function toggleEnabled(next: boolean) {
		try {
			await updateModel.mutateAsync({
				metadata: m.metadata,
				spec: { ...m.spec, enabled: next },
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to update model.",
			);
		}
	}
	async function handleDelete() {
		const ok = await confirm({
			title: `Delete model ${m.metadata.name}?`,
			description:
				"Policies and keys referencing this model will lose access until reattached.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteModel.mutateAsync(m.metadata.id ?? "");
			toast("success", `Model "${displayLabel(m.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete model.",
			);
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
								className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
								aria-label={dep}
							/>
						)}
						<DiagnosticDot diagnostics={diagnostics} />
					</div>
					{(hasDisplayName(m.metadata) || dep) && (
						<div className="text-[11px] text-muted-foreground truncate">
							{dep ? (
								<span className="text-amber-700 dark:text-amber-400">
									{dep}
								</span>
							) : (
								<code className="font-mono">{m.metadata.name}</code>
							)}
						</div>
					)}
				</Link>
			</td>
			{!hideProvider && (
				<td className="px-3 py-2 text-sm text-foreground">
					<HostBadges m={m} hostsById={hostsById} />
				</td>
			)}
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
								? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/60"
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
					onDelete={() => void handleDelete()}
				/>
			</td>
		</tr>
	);
}

interface ModelsTableProps {
	items: Model[];
	sort: ModelsSortKey;
	dir: ModelsSortDir;
	onSort: (field: ModelsSortKey) => void;
	hideProvider?: boolean;
	hostsById?: Map<string, Host>;
}

export function ModelsTable({
	items,
	sort,
	dir,
	onSort,
	hideProvider,
	hostsById,
}: ModelsTableProps) {
	return (
		<div className="overflow-x-auto rounded-lg border border-border bg-card">
			<table className="w-full border-collapse">
				<thead className="bg-muted/40">
					<tr>
						<SortHeader
							label="Name"
							field="name"
							current={sort}
							dir={dir}
							onClick={onSort}
						/>
						{!hideProvider && (
							<th
								scope="col"
								className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-left"
							>
								Hosts
							</th>
						)}
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
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}
