import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowDown, ArrowUp, Boxes, Plus, Search } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { modelsListQueryOptions, useModels } from "#/api/hooks/models";
import type { Model } from "#/api/types/model";

type SortKey = "name" | "provider" | "family" | "ctx" | "input" | "output";
type SortDir = "asc" | "desc";

const searchSchema = z.object({
	q: z.string().default(""),
	provider: z.string().default(""),
	sort: z
		.enum(["name", "provider", "family", "ctx", "input", "output"])
		.default("name"),
	dir: z.enum(["asc", "desc"]).default("asc"),
});

export const Route = createFileRoute("/_authenticated/models/")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(modelsListQueryOptions),
	component: ModelsPage,
});

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

function sortValue(m: Model, key: SortKey): string | number {
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

function applyFilter(items: Model[], q: string, provider: string): Model[] {
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

function applySort(items: Model[], key: SortKey, dir: SortDir): Model[] {
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
	field: SortKey;
	current: SortKey;
	dir: SortDir;
	onClick: (field: SortKey) => void;
	align?: "left" | "right";
	className?: string;
}

function SortHeader({
	label,
	field,
	current,
	dir,
	onClick,
	align = "left",
	className,
}: SortHeaderProps) {
	const active = current === field;
	const Icon = dir === "asc" ? ArrowUp : ArrowDown;
	return (
		<th
			scope="col"
			className={[
				"px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400",
				align === "right" ? "text-right" : "text-left",
				className ?? "",
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

function ModelRow({ m }: { m: Model }) {
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
			<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 capitalize">
				{m.spec.provider}
			</td>
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
				title={ctxIn || ctxOut ? `in ${fmtTokens(ctxIn)} / out ${fmtTokens(ctxOut)}` : undefined}
			>
				{fmtTokens(ctx)}
			</td>
			<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 text-right tabular-nums">
				{fmtPrice(input)}
			</td>
			<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 text-right tabular-nums">
				{fmtPrice(output)}
			</td>
		</tr>
	);
}

interface FilterChipProps {
	value: string;
	current: string;
	count: number;
	onClick: (value: string) => void;
	children: React.ReactNode;
}

function FilterChip({ value, current, count, onClick, children }: FilterChipProps) {
	const active = current === value;
	return (
		<button
			type="button"
			onClick={() => onClick(value)}
			className={[
				"inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
				active
					? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
					: "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
			].join(" ")}
		>
			{children}
			<span
				className={[
					"text-[10px] tabular-nums",
					active ? "opacity-70" : "text-neutral-400 dark:text-neutral-500",
				].join(" ")}
			>
				{count}
			</span>
		</button>
	);
}

function ModelsList() {
	const { data } = useModels();
	const navigate = useNavigate({ from: "/models" });
	const search = Route.useSearch();
	const items = data.items ?? [];

	const providers = Array.from(new Set(items.map((m) => m.spec.provider))).sort();
	const filtered = applyFilter(items, search.q, search.provider);
	const visible = applySort(filtered, search.sort, search.dir);

	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }) });
	}
	function setProvider(provider: string) {
		void navigate({ search: (prev) => ({ ...prev, provider }) });
	}
	function toggleSort(field: SortKey) {
		const dir: SortDir =
			search.sort === field ? (search.dir === "asc" ? "desc" : "asc") : "asc";
		void navigate({ search: (prev) => ({ ...prev, sort: field, dir }) });
	}

	return (
		<div>
			<div className="flex items-baseline justify-between mb-4 gap-4">
				<div className="min-w-0">
					<h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
						Models
					</h1>
					<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
						Models you've registered and how Relay routes traffic to them.
					</p>
				</div>
				<Link
					to="/models/new"
					className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
				>
					<Plus className="w-3.5 h-3.5" />
					New model
				</Link>
			</div>

			<div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
				<div className="flex items-center gap-1 flex-wrap">
					<FilterChip
						value=""
						current={search.provider}
						count={items.length}
						onClick={setProvider}
					>
						All
					</FilterChip>
					{providers.map((p) => (
						<FilterChip
							key={p}
							value={p}
							current={search.provider}
							count={items.filter((m) => m.spec.provider === p).length}
							onClick={setProvider}
						>
							<span className="capitalize">{p}</span>
						</FilterChip>
					))}
				</div>
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
					<input
						type="search"
						value={search.q}
						onChange={(e) => setQ(e.currentTarget.value)}
						placeholder="Search models"
						className="h-8 pl-8 pr-3 rounded-md text-xs text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow w-48"
					/>
				</div>
			</div>

			{visible.length === 0 ? (
				<div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-14 text-center">
					<Boxes className="w-6 h-6 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
					<p className="text-sm text-neutral-500 dark:text-neutral-400">
						{items.length === 0
							? "No models configured."
							: "No models match the current filter."}
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
					<table className="w-full border-collapse">
						<thead className="bg-neutral-50 dark:bg-neutral-900/60">
							<tr>
								<SortHeader
									label="Name"
									field="name"
									current={search.sort}
									dir={search.dir}
									onClick={toggleSort}
								/>
								<SortHeader
									label="Provider"
									field="provider"
									current={search.sort}
									dir={search.dir}
									onClick={toggleSort}
								/>
								<SortHeader
									label="Family"
									field="family"
									current={search.sort}
									dir={search.dir}
									onClick={toggleSort}
								/>
								<SortHeader
									label="Context"
									field="ctx"
									current={search.sort}
									dir={search.dir}
									onClick={toggleSort}
									align="right"
								/>
								<SortHeader
									label="Input $/M"
									field="input"
									current={search.sort}
									dir={search.dir}
									onClick={toggleSort}
									align="right"
								/>
								<SortHeader
									label="Output $/M"
									field="output"
									current={search.sort}
									dir={search.dir}
									onClick={toggleSort}
									align="right"
								/>
							</tr>
						</thead>
						<tbody>
							{visible.map((m) => (
								<ModelRow key={m.metadata.name} m={m} />
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function ModelsPage() {
	return (
		<Suspense
			fallback={
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<ModelsList />
		</Suspense>
	);
}
