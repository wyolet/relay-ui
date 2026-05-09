import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { Model } from "#/api/types/model";
import { Switch } from "#/components/Switch";
import { toast } from "#/components/Toast";

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

function sortValue(m: Model, key: ModelsSortKey): string | number {
	switch (key) {
		case "name":
			return (m.spec.displayName ?? m.metadata.name).toLowerCase();
		case "provider":
			return m.spec.provider.toLowerCase();
		case "family":
			return (m.spec.family ?? "").toLowerCase();
		case "ctx":
			return m.spec.contextWindowTotal ?? m.spec.contextWindow ?? 0;
		case "input":
			return m.spec.pricing?.rates?.input ?? Number.POSITIVE_INFINITY;
		case "output":
			return m.spec.pricing?.rates?.output ?? Number.POSITIVE_INFINITY;
	}
}

export function applyModelFilter(
	items: Model[],
	q: string,
	provider: string,
): Model[] {
	const ql = q.trim().toLowerCase();
	return items.filter((m) => {
		if (provider && m.spec.provider !== provider) return false;
		if (!ql) return true;
		const hay = [
			m.metadata.name,
			m.spec.displayName,
			m.spec.upstreamName,
			m.spec.family,
			m.spec.provider,
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
				"px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400",
				align === "right" ? "text-right" : "text-left",
			].join(" ")}
		>
			<button
				type="button"
				onClick={() => onClick(field)}
				className={[
					"inline-flex items-center gap-1 transition-colors",
					align === "right" ? "flex-row-reverse" : "",
					active
						? "text-neutral-900 dark:text-neutral-100"
						: "hover:text-neutral-700 dark:hover:text-neutral-200",
				].join(" ")}
			>
				{label}
				{active && <Icon className="w-3 h-3" aria-hidden="true" />}
			</button>
		</th>
	);
}

function RowMenu({ name }: { name: string }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative inline-block">
			<button
				type="button"
				onClick={(e) => {
					e.preventDefault();
					setOpen((v) => !v);
				}}
				onBlur={() => setTimeout(() => setOpen(false), 150)}
				aria-label="Model actions"
				aria-haspopup="menu"
				aria-expanded={open}
				className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
			>
				<MoreHorizontal className="w-3.5 h-3.5" />
			</button>
			{open && (
				<div
					role="menu"
					className="absolute right-0 top-8 z-10 min-w-[140px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg py-1"
				>
					<Link
						to="/models/$name/edit"
						params={{ name }}
						role="menuitem"
						onMouseDown={(e) => e.preventDefault()}
						className="block px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
					>
						Edit
					</Link>
					<button
						type="button"
						role="menuitem"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							setOpen(false);
							toast("success", "Delete model — coming soon.");
						}}
						className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
					>
						Delete
					</button>
				</div>
			)}
		</div>
	);
}

function ModelRow({ m, hideProvider }: { m: Model; hideProvider?: boolean }) {
	const dep = deprecationNote(m);
	const ctx = m.spec.contextWindowTotal ?? m.spec.contextWindow;
	const ctxIn = m.spec.contextWindowInput;
	const ctxOut = m.spec.contextWindowOutput ?? m.spec.maxOutputTokens;
	const input = m.spec.pricing?.rates?.input;
	const output = m.spec.pricing?.rates?.output;
	const family = m.spec.family;
	const version = m.spec.version;

	return (
		<tr className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
			<td className="px-3 py-2">
				<Link
					to="/models/$name"
					params={{ name: m.metadata.name }}
					className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
							{m.spec.displayName ?? m.metadata.name}
						</span>
						{dep && (
							<AlertTriangle
								className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
								aria-label={dep}
							/>
						)}
					</div>
					{(m.spec.displayName || dep) && (
						<div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
							{dep ? (
								<span className="text-amber-700 dark:text-amber-400">{dep}</span>
							) : (
								<code className="font-mono">{m.metadata.name}</code>
							)}
						</div>
					)}
				</Link>
			</td>
			{!hideProvider && (
				<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 capitalize">
					{m.spec.provider}
				</td>
			)}
			<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300">
				{family ? (
					<>
						{family}
						{version && (
							<span className="text-neutral-400 dark:text-neutral-500">
								{" · "}
								{version}
							</span>
						)}
					</>
				) : (
					<span className="text-neutral-400 dark:text-neutral-600">—</span>
				)}
			</td>
			<td
				className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 text-right tabular-nums"
				title={
					ctxIn || ctxOut
						? `in ${fmtTokens(ctxIn)} / out ${fmtTokens(ctxOut)}`
						: undefined
				}
			>
				{fmtTokens(ctx)}
			</td>
			<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 text-right tabular-nums">
				{fmtPrice(input)}
			</td>
			<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 text-right tabular-nums">
				{fmtPrice(output)}
			</td>
			<td className="px-3 py-2">
				<Switch
					checked
					onChange={() =>
						toast("success", "Model enable/disable — backend support coming soon.")
					}
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
}

export function ModelsTable({
	items,
	sort,
	dir,
	onSort,
	hideProvider,
}: ModelsTableProps) {
	return (
		<div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
			<table className="w-full border-collapse">
				<thead className="bg-neutral-50 dark:bg-neutral-900/60">
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
							className="w-12 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
						>
							On
						</th>
						<th scope="col" className="w-10 px-3 py-2" aria-label="Actions" />
					</tr>
				</thead>
				<tbody>
					{items.map((m) => (
						<ModelRow key={m.metadata.name} m={m} hideProvider={hideProvider} />
					))}
				</tbody>
			</table>
		</div>
	);
}
