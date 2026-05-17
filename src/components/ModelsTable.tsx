import { Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	MoreHorizontal,
} from "lucide-react";
import { useUpdateModel } from "@/api/hooks/models";
import { ApiError } from "@/api/types/errors";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import { HostLogo } from "@/components/HostLogo";
import { Switch } from "@/shared/Switch";
import { toast } from "@/shared/Toast";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { useModelDiagnostics } from "@/diagnostics/useDiagnostics";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ModelsSortKey =
	| "name"
	| "provider"
	| "family"
	| "ctx"
	| "input"
	| "output";
export type ModelsSortDir = "asc" | "desc";

export const MODEL_SORT_KEYS = [
	"name",
	"provider",
	"family",
	"ctx",
	"input",
	"output",
] as const;

function fmtTokens(n: number | undefined): string {
	if (!n) return "—";
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
	return String(n);
}

function fmtPrice(v: number | undefined): string {
	if (v === undefined) return "—";
	return v.toFixed(2);
}

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

function providerOf(m: Model): string {
	return m.metadata.owner?.kind === "provider"
		? (m.metadata.owner.id ?? "")
		: "";
}

function sortValue(m: Model, key: ModelsSortKey): string | number {
	switch (key) {
		case "name":
			return displayLabel(m.metadata).toLowerCase();
		case "provider":
			return providerOf(m).toLowerCase();
		case "family":
			return (m.spec.family ?? "").toLowerCase();
		case "ctx":
			return m.spec.contextWindowTotal ?? 0;
		case "input":
			return Number.POSITIVE_INFINITY;
		case "output":
			return Number.POSITIVE_INFINITY;
	}
}

export function applyModelFilter(
	items: Model[],
	q: string,
	provider: string,
): Model[] {
	const ql = q.trim().toLowerCase();
	return items.filter((m) => {
		if (provider && providerOf(m) !== provider) return false;
		if (!ql) return true;
		const hostNames = (m.spec.hosts ?? []).map((h) => h.upstreamName);
		const hay = [
			m.metadata.name,
			m.metadata.displayName,
			m.spec.family,
			providerOf(m),
			...hostNames,
			...(m.spec.aliases ?? []),
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
): Model[] {
	const sorted = [...items].sort((a, b) => {
		const av = sortValue(a, key);
		const bv = sortValue(b, key);
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

function RowMenu({ name }: { name: string }) {
	const navigate = useNavigate();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Model actions"
				className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<MoreHorizontal className="w-3.5 h-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-[160px]">
				<DropdownMenuItem
					onClick={() =>
						navigate({ to: "/models/$name/edit", params: { name } })
					}
				>
					Edit
				</DropdownMenuItem>
				<DropdownMenuItem
					variant="destructive"
					onClick={() => toast("success", "Delete model — coming soon.")}
				>
					Delete
				</DropdownMenuItem>
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
					size={14}
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
	const diagnostics = useModelDiagnostics(m.metadata.id);
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
	const dep = deprecationNote(m);
	const ctx = m.spec.contextWindowTotal;
	const ctxIn = m.spec.contextWindowInput;
	const ctxOut = m.spec.contextWindowOutput ?? m.spec.maxOutputTokens;
	const input: number | undefined = undefined;
	const output: number | undefined = undefined;
	const family = m.spec.family;
	const version = m.spec.version;
	const provider = providerOf(m);

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
					<div className="inline-flex items-center gap-2">
						<HostBadges m={m} hostsById={hostsById} />
						<span className="capitalize">
							{provider || (
								<span className="text-muted-foreground/70">—</span>
							)}
						</span>
					</div>
				</td>
			)}
			<td className="px-3 py-2 text-sm text-foreground">
				{family ? (
					<>
						{family}
						{version && (
							<span className="text-muted-foreground">
								{" · "}
								{version}
							</span>
						)}
					</>
				) : (
					<span className="text-muted-foreground/70">—</span>
				)}
			</td>
			<td
				className="px-3 py-2 text-sm text-foreground text-right tabular-nums"
				title={
					ctxIn || ctxOut
						? `in ${fmtTokens(ctxIn)} / out ${fmtTokens(ctxOut)}`
						: undefined
				}
			>
				{fmtTokens(ctx)}
			</td>
			<td className="px-3 py-2 text-sm text-foreground text-right tabular-nums">
				{fmtPrice(input)}
			</td>
			<td className="px-3 py-2 text-sm text-foreground text-right tabular-nums">
				{fmtPrice(output)}
			</td>
			<td className="px-3 py-2">
				<Switch
					checked={enabled}
					onChange={(next) => void toggleEnabled(next)}
					disabled={updateModel.isPending}
					label={`Toggle ${m.metadata.name}`}
				/>
			</td>
			<td className="px-3 py-2 text-right">
				<RowMenu name={m.metadata.name} />
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
							<SortHeader
								label="Provider"
								field="provider"
								current={sort}
								dir={dir}
								onClick={onSort}
							/>
						)}
						<SortHeader
							label="Family"
							field="family"
							current={sort}
							dir={dir}
							onClick={onSort}
						/>
						<SortHeader
							label="Context"
							field="ctx"
							current={sort}
							dir={dir}
							onClick={onSort}
							align="right"
						/>
						<SortHeader
							label="Input $/M"
							field="input"
							current={sort}
							dir={dir}
							onClick={onSort}
							align="right"
						/>
						<SortHeader
							label="Output $/M"
							field="output"
							current={sort}
							dir={dir}
							onClick={onSort}
							align="right"
						/>
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
