import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Boxes, Plus, Search } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { modelsListQueryOptions, useModels } from "@/api/hooks/models";
import {
	applyModelFilter,
	applyModelSort,
	type ModelsSortDir,
	type ModelsSortKey,
	ModelsTable,
} from "@/components/ModelsTable";

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
			aria-pressed={active}
			className={[
				"inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				active
					? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300"
					: "text-muted-foreground hover:text-foreground hover:bg-muted",
			].join(" ")}
		>
			{children}
			<span
				className={[
					"text-[10px] tabular-nums",
					active
						? "text-brand-600 dark:text-brand-400"
						: "text-muted-foreground",
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
	const filtered = applyModelFilter(items, search.q, search.provider);
	const visible = applyModelSort(filtered, search.sort, search.dir);

	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }) });
	}
	function setProvider(provider: string) {
		void navigate({ search: (prev) => ({ ...prev, provider }) });
	}
	function toggleSort(field: ModelsSortKey) {
		const dir: ModelsSortDir =
			search.sort === field ? (search.dir === "asc" ? "desc" : "asc") : "asc";
		void navigate({ search: (prev) => ({ ...prev, sort: field, dir }) });
	}

	return (
		<div>
			<div className="flex items-baseline justify-between mb-4 gap-4">
				<div className="min-w-0">
					<h1 className="text-lg font-semibold text-foreground">
						Models
					</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						Models you've registered and how Relay routes traffic to them.
					</p>
				</div>
				<Link
					to="/models/new"
					className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
					<input
						type="search"
						value={search.q}
						onChange={(e) => setQ(e.currentTarget.value)}
						placeholder="Search models"
						className="h-8 pl-8 pr-3 rounded-md text-xs text-foreground bg-card border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring focus:border-transparent transition-shadow w-48"
					/>
				</div>
			</div>

			{visible.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Boxes className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					<p className="text-sm text-muted-foreground">
						{items.length === 0
							? "No models configured."
							: "No models match the current filter."}
					</p>
				</div>
			) : (
				<ModelsTable
					items={visible}
					sort={search.sort}
					dir={search.dir}
					onSort={toggleSort}
				/>
			)}
		</div>
	);
}

function ModelsPage() {
	return (
		<Suspense
			fallback={
				<div className="text-muted-foreground text-sm">Loading…</div>
			}
		>
			<ModelsList />
		</Suspense>
	);
}
