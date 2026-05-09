import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Boxes,
	ChevronLeft,
	ExternalLink,
	Pencil,
	Trash2,
} from "lucide-react";
import { Suspense, useState } from "react";
import { z } from "zod";
import { modelsListQueryOptions, useModels } from "#/api/hooks/models";
import { poolsListQueryOptions, usePools } from "#/api/hooks/pools";
import {
	providerDetailQueryOptions,
	useDeleteProvider,
	useProvider,
} from "#/api/hooks/providers";
import { secretsListQueryOptions } from "#/api/hooks/secrets";
import { ApiError } from "#/api/types/errors";
import {
	applyModelSort,
	type ModelsSortDir,
	type ModelsSortKey,
	ModelsTable,
} from "#/components/ModelsTable";
import { ProviderKeys } from "#/components/ProviderKeys";
import { toast } from "#/components/Toast";

type Tab = "overview" | "models" | "keys";

const searchSchema = z.object({
	tab: z.enum(["overview", "models", "keys"]).default("overview"),
	add: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/providers/$name")({
	validateSearch: searchSchema,
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			providerDetailQueryOptions(params.name),
		);
		void context.queryClient.prefetchQuery(modelsListQueryOptions);
		void context.queryClient.prefetchQuery(poolsListQueryOptions);
		void context.queryClient.prefetchQuery(secretsListQueryOptions);
		return null;
	},
	component: ProviderDetailPage,
});

function dash(v: string | number | null | undefined): React.ReactNode {
	if (v === null || v === undefined || v === "") {
		return <span className="text-neutral-400 dark:text-neutral-600">—</span>;
	}
	return v;
}

interface SectionProps {
	title: string;
	right?: React.ReactNode;
	children: React.ReactNode;
}

function Section({ title, right, children }: SectionProps) {
	return (
		<section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
			<header className="flex items-center justify-between px-4 h-9 border-b border-neutral-200 dark:border-neutral-800">
				<h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
					{title}
				</h2>
				{right}
			</header>
			<div className="p-4">{children}</div>
		</section>
	);
}

interface FieldRowProps {
	label: string;
	children: React.ReactNode;
}

function FieldRow({ label, children }: FieldRowProps) {
	return (
		<div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
			<dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
			<dd className="text-neutral-900 dark:text-neutral-100 min-w-0">
				{children}
			</dd>
		</div>
	);
}

interface ExternalRowProps {
	label: string;
	href: string | undefined;
}

function ExternalRow({ label, href }: ExternalRowProps) {
	if (!href) {
		return (
			<FieldRow label={label}>
				<span className="text-neutral-400 dark:text-neutral-600">—</span>
			</FieldRow>
		);
	}
	return (
		<FieldRow label={label}>
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline truncate"
			>
				<span className="truncate">{href}</span>
				<ExternalLink className="w-3 h-3 shrink-0" />
			</a>
		</FieldRow>
	);
}

interface TabLinkProps {
	value: Tab;
	current: Tab;
	onClick: (tab: Tab) => void;
	count?: number;
	children: React.ReactNode;
}

function TabLink({ value, current, onClick, count, children }: TabLinkProps) {
	const active = current === value;
	return (
		<button
			type="button"
			onClick={() => onClick(value)}
			className={[
				"relative h-9 px-3 text-xs font-medium transition-colors inline-flex items-center gap-1.5",
				active
					? "text-neutral-900 dark:text-neutral-100"
					: "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100",
			].join(" ")}
		>
			{children}
			{typeof count === "number" && (
				<span
					className={[
						"text-[10px] tabular-nums",
						active ? "opacity-70" : "text-neutral-400 dark:text-neutral-500",
					].join(" ")}
				>
					{count}
				</span>
			)}
			{active && (
				<span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-500" />
			)}
		</button>
	);
}

function ModelsTab({ providerName }: { providerName: string }) {
	const { data } = useModels();
	const items = (data.items ?? []).filter(
		(m) => m.spec.provider === providerName,
	);
	const [sort, setSort] = useState<ModelsSortKey>("name");
	const [dir, setDir] = useState<ModelsSortDir>("asc");
	const visible = applyModelSort(items, sort, dir);

	function toggleSort(field: ModelsSortKey) {
		if (sort === field) {
			setDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSort(field);
			setDir("asc");
		}
	}

	if (items.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-14 text-center">
				<Boxes className="w-6 h-6 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
				<p className="text-sm text-neutral-500 dark:text-neutral-400">
					No models registered against this provider yet.
				</p>
				<Link
					to="/models/new"
					className="inline-flex items-center gap-1.5 mt-4 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors"
				>
					Add a model
				</Link>
			</div>
		);
	}

	return (
		<ModelsTable
			items={visible}
			sort={sort}
			dir={dir}
			onSort={toggleSort}
			hideProvider
		/>
	);
}

function ProviderDetailInner() {
	const { name } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/providers/$name" });
	const { data: provider } = useProvider(name);
	const { data: modelsData } = useModels();
	const { data: poolsData } = usePools();
	const deleteProvider = useDeleteProvider();

	const modelsCount = (modelsData.items ?? []).filter(
		(m) => m.spec.provider === name,
	).length;
	const keysCount = (poolsData.items ?? [])
		.filter((p) => p.spec.provider === name)
		.reduce((acc, p) => acc + (p.spec.secrets?.length ?? 0), 0);

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab }) });
	}

	async function handleDelete() {
		if (!window.confirm(`Delete provider "${name}"? This cannot be undone.`))
			return;
		try {
			await deleteProvider.mutateAsync(name);
			toast("success", `Provider "${name}" deleted.`);
			void navigate({ to: "/providers" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete provider.");
			}
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/providers"
					className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Providers
				</Link>
				<div className="mt-2 flex items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex items-center gap-2 min-w-0">
							<h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 truncate capitalize">
								{provider.spec.displayName ?? provider.metadata.name}
							</h1>
							{provider.spec.default && (
								<span className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
									default
								</span>
							)}
						</div>
						<div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
							<code className="font-mono">{provider.metadata.name}</code>
							{provider.spec.kind && (
								<>
									<span className="text-neutral-300 dark:text-neutral-700">·</span>
									<span>{provider.spec.kind}</span>
								</>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<Link
							to="/providers/$name/edit"
							params={{ name }}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
						>
							<Pencil className="w-3.5 h-3.5" />
							Edit
						</Link>
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleteProvider.isPending}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-red-600 dark:text-red-400 border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</button>
					</div>
				</div>
			</div>

			<div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1">
				<TabLink value="overview" current={search.tab} onClick={setTab}>
					Overview
				</TabLink>
				<TabLink
					value="models"
					current={search.tab}
					onClick={setTab}
					count={modelsCount}
				>
					Models
				</TabLink>
				<TabLink
					value="keys"
					current={search.tab}
					onClick={setTab}
					count={keysCount}
				>
					Keys
				</TabLink>
			</div>

			{search.tab === "overview" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Section title="Connection">
						<dl>
							<FieldRow label="Kind">{dash(provider.spec.kind)}</FieldRow>
							<FieldRow label="Base URL">
								<code className="text-xs font-mono break-all">
									{dash(provider.spec.baseURL)}
								</code>
							</FieldRow>
							<FieldRow label="Default pool">
								{provider.spec.defaultPool ? (
									<Link
										to="/pools/$name"
										params={{ name: provider.spec.defaultPool }}
										className="text-brand-600 dark:text-brand-400 hover:underline"
									>
										{provider.spec.defaultPool}
									</Link>
								) : (
									dash(undefined)
								)}
							</FieldRow>
						</dl>
					</Section>

					<Section title="Links">
						<dl>
							<ExternalRow label="Homepage" href={provider.spec.homepageURL} />
							<ExternalRow label="Docs" href={provider.spec.docsURL} />
							<ExternalRow label="Console" href={provider.spec.consoleURL} />
							<ExternalRow label="Status" href={provider.spec.statusPageURL} />
						</dl>
					</Section>

					{provider.spec.description && (
						<div className="lg:col-span-2">
							<Section title="Description">
								<p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
									{provider.spec.description}
								</p>
							</Section>
						</div>
					)}
				</div>
			)}

			{search.tab === "models" && <ModelsTab providerName={name} />}

			{search.tab === "keys" && (
				<ProviderKeys providerName={name} autoOpenAdd={!!search.add} />
			)}
		</div>
	);
}

function ProviderDetailPage() {
	return (
		<Suspense
			fallback={
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<ProviderDetailInner />
		</Suspense>
	);
}
