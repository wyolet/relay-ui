import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Boxes, Plus } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions, useHosts } from "@/api/hooks/hosts";
import { modelsListQueryOptions, useModels } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import {
	applyHostFilter,
	applyHostSort,
	type HostsSortDir,
	type HostsSortKey,
	HostsTable,
} from "@/hosts/HostsTable";
import {
	applyModelFilter,
	applyModelSort,
	type ModelsSortDir,
	type ModelsSortKey,
	ModelsTable,
} from "@/models/ModelsTable";
import { SearchBox } from "@/shared/SearchBox";
import { TableToolbar } from "@/shared/TableToolbar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Tab = "models" | "hosts";

const searchSchema = z.object({
	tab: z.enum(["models", "hosts"]).default("models"),
	q: z.string().default(""),
	provider: z.string().default(""),
	sort: z
		.enum(["name", "provider", "family", "ctx", "input", "output"])
		.default("name"),
	dir: z.enum(["asc", "desc"]).default("asc"),
	hsort: z.enum(["name", "baseURL"]).default("name"),
	hdir: z.enum(["asc", "desc"]).default("asc"),
});

export const Route = createFileRoute("/_authenticated/models/")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
		]),
	component: ModelsPage,
});

function ModelsList() {
	const { data } = useModels();
	const { data: hostsData } = useHosts();
	const navigate = useNavigate({ from: "/models" });
	const search = Route.useSearch();
	const items = data.items ?? [];
	const hostsById = new Map(
		(hostsData.items ?? [])
			.filter((h) => h.metadata.id)
			.map((h) => [h.metadata.id as string, h] as const),
	);

	const providers = Array.from(
		new Set(
			items
				.map((m) =>
					m.metadata.owner?.kind === "provider"
						? (m.metadata.owner.id ?? "")
						: "",
				)
				.filter(Boolean),
		),
	).sort();
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
			<TableToolbar
				search={
					<SearchBox
						value={search.q}
						onChange={setQ}
						placeholder="Search models"
					/>
				}
				filters={
					<Select
						value={search.provider || "all"}
						onValueChange={(v) => setProvider(v === "all" || v == null ? "" : v)}
					>
						<SelectTrigger className="w-40">
							<SelectValue>
								{search.provider ? (
									<span className="capitalize">{search.provider}</span>
								) : (
									"All providers"
								)}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All providers</SelectItem>
							{providers.map((p) => (
								<SelectItem key={p} value={p}>
									<span className="capitalize">{p}</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
				actions={
					<Link
						to="/models/new"
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="w-3.5 h-3.5" />
						New model
					</Link>
				}
			/>

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
					hostsById={hostsById}
				/>
			)}
		</div>
	);
}

function HostsList() {
	const { data } = useHosts();
	const navigate = useNavigate({ from: "/models" });
	const search = Route.useSearch();
	const items = data.items ?? [];

	const filtered = applyHostFilter(items, search.q);
	const visible = applyHostSort(filtered, search.hsort, search.hdir);

	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }) });
	}
	function toggleSort(field: HostsSortKey) {
		const dir: HostsSortDir =
			search.hsort === field
				? search.hdir === "asc"
					? "desc"
					: "asc"
				: "asc";
		void navigate({ search: (prev) => ({ ...prev, hsort: field, hdir: dir }) });
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox
						value={search.q}
						onChange={setQ}
						placeholder="Search hosts"
					/>
				}
			/>

			{visible.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<p className="text-sm text-muted-foreground">
						{items.length === 0
							? "No hosts configured."
							: "No hosts match the current filter."}
					</p>
				</div>
			) : (
				<HostsTable
					items={visible}
					sort={search.hsort}
					dir={search.hdir}
					onSort={toggleSort}
				/>
			)}
		</div>
	);
}

interface TabLinkProps {
	value: Tab;
	current: Tab;
	onClick: (t: Tab) => void;
	children: React.ReactNode;
}

function TabLink({ value, current, onClick, children }: TabLinkProps) {
	const active = current === value;
	return (
		<button
			type="button"
			onClick={() => onClick(value)}
			className={[
				"relative h-9 px-3 text-xs font-medium transition-colors",
				active
					? "text-foreground"
					: "text-muted-foreground hover:text-foreground",
			].join(" ")}
		>
			{children}
			{active && (
				<span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-500" />
			)}
		</button>
	);
}

function ModelsPage() {
	const navigate = useNavigate({ from: "/models" });
	const search = Route.useSearch();

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab }) });
	}

	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Models</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Models you've registered and the upstream hosts that serve them.
				</p>
			</div>

			<div className="border-b border-border flex items-center gap-1 mb-4">
				<TabLink value="models" current={search.tab} onClick={setTab}>
					Models
				</TabLink>
				<TabLink value="hosts" current={search.tab} onClick={setTab}>
					Hosts
				</TabLink>
			</div>

			<Suspense
				fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
			>
				{search.tab === "models" ? <ModelsList /> : <HostsList />}
			</Suspense>
		</div>
	);
}
