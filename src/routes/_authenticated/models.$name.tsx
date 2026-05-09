import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	Braces,
	Brain,
	ChevronLeft,
	ExternalLink,
	Eye,
	FileText,
	Globe,
	Image as ImageIcon,
	Layers,
	ListOrdered,
	ListTree,
	type LucideIcon,
	MessageSquare,
	Mic,
	Monitor,
	Paperclip,
	Pencil,
	PencilLine,
	Radio,
	Settings2,
	Trash2,
	Volume2,
	Wrench,
	Zap,
} from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import {
	modelDetailQueryOptions,
	useDeleteModel,
	useModel,
} from "#/api/hooks/models";
import { providerDetailQueryOptions } from "#/api/hooks/providers";
import { ApiError } from "#/api/types/errors";
import type { Capabilities, Model, Modalities } from "#/api/types/model";
import type { Provider } from "#/api/types/provider";
import { toast } from "#/components/Toast";

type Tab = "overview" | "pricing" | "limits";

const searchSchema = z.object({
	tab: z.enum(["overview", "pricing", "limits"]).default("overview"),
});

export const Route = createFileRoute("/_authenticated/models/$name")({
	validateSearch: searchSchema,
	loader: async ({ context, params }) => {
		const model = await context.queryClient.ensureQueryData(
			modelDetailQueryOptions(params.name),
		);
		void context.queryClient.prefetchQuery(
			providerDetailQueryOptions(model.spec.provider),
		);
		return null;
	},
	component: ModelDetailPage,
});

function fmtTokens(n: number | undefined): string {
	if (!n) return "—";
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
	return String(n);
}

function deprecationNote(m: Model): string | null {
	const d = m.spec.deprecation;
	const date = m.spec.deprecationDate;
	if (!d && !date) return null;
	const parts: string[] = [];
	if (d?.status) parts.push(d.status);
	if (d?.sunsetDate) parts.push(`sunsets ${d.sunsetDate}`);
	else if (date) parts.push(`deprecated ${date}`);
	if (d?.replacement) parts.push(`successor → ${d.replacement}`);
	return parts.join(" · ") || null;
}

function activeCapabilities(cap: Capabilities | undefined): string[] {
	if (!cap) return [];
	return Object.entries(cap)
		.filter(([, v]) => v === true)
		.map(([k]) => k);
}

function modalityList(m: Modalities | undefined, side: "input" | "output"): string {
	const arr = m?.[side];
	if (!arr || arr.length === 0) return "—";
	return arr.join(", ");
}

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

interface CapMeta {
	icon: LucideIcon;
	label: string;
}

const CAPABILITY_META: Record<string, CapMeta> = {
	chat: { icon: MessageSquare, label: "Chat" },
	vision: { icon: Eye, label: "Vision" },
	tools: { icon: Wrench, label: "Tool use" },
	parallelTools: { icon: ListOrdered, label: "Parallel tool calls" },
	jsonMode: { icon: Braces, label: "JSON mode" },
	structuredOutput: { icon: ListTree, label: "Structured output" },
	structuredOutputs: { icon: ListTree, label: "Structured outputs" },
	streaming: { icon: Radio, label: "Streaming" },
	reasoning: { icon: Brain, label: "Reasoning" },
	systemMessages: { icon: FileText, label: "System messages" },
	assistantPrefill: { icon: PencilLine, label: "Assistant prefill" },
	fileInput: { icon: Paperclip, label: "File input" },
	embeddings: { icon: Zap, label: "Embeddings" },
	webSearch: { icon: Globe, label: "Web search" },
	computerUse: { icon: Monitor, label: "Computer use" },
	batch: { icon: Layers, label: "Batch" },
	promptCache: { icon: Settings2, label: "Prompt caching" },
	audio: { icon: Volume2, label: "Audio" },
	audioInput: { icon: Mic, label: "Audio input" },
	audioOutput: { icon: Volume2, label: "Audio output" },
};

function CapabilityIcon({ name }: { name: string }) {
	const meta = CAPABILITY_META[name] ?? {
		icon: ImageIcon,
		label: name,
	};
	const Icon = meta.icon;
	return (
		<span className="relative group inline-flex">
			<span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
				<Icon className="w-3.5 h-3.5" aria-hidden="true" />
				<span className="sr-only">{meta.label}</span>
			</span>
			<span
				role="tooltip"
				className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10 shadow-sm"
			>
				{meta.label}
			</span>
		</span>
	);
}

function CapabilityChips({ cap }: { cap: Capabilities | undefined }) {
	const active = activeCapabilities(cap);
	if (active.length === 0)
		return <span className="text-neutral-400 dark:text-neutral-600">—</span>;
	return (
		<div className="flex flex-wrap gap-1.5">
			{active.map((c) => (
				<CapabilityIcon key={c} name={c} />
			))}
		</div>
	);
}

function ProviderCard({ name, provider }: { name: string; provider: Provider | undefined }) {
	return (
		<Link
			to="/providers/$name"
			params={{ name }}
			className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 hover:border-brand-300 dark:hover:border-brand-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
		>
			<div className="min-w-0 flex items-center gap-2">
				<span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 capitalize truncate">
					{provider?.spec.displayName ?? name}
				</span>
				{provider?.spec.kind && (
					<span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
						{provider.spec.kind}
					</span>
				)}
				{provider?.spec.default && (
					<span className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
						default
					</span>
				)}
			</div>
			<ExternalLink className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
		</Link>
	);
}

function PricingTable({ model }: { model: Model }) {
	const p = model.spec.pricing;
	if (!p?.rates || Object.keys(p.rates).length === 0) {
		return <span className="text-neutral-400 dark:text-neutral-600">—</span>;
	}
	const unit = p.unit || "1M tokens";
	const currency = p.currency || "USD";
	const sym = currency === "USD" ? "$" : `${currency} `;
	const entries = Object.entries(p.rates);
	return (
		<table className="w-full text-sm">
			<thead>
				<tr className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
					<th className="text-left font-medium pb-2">Kind</th>
					<th className="text-right font-medium pb-2">
						{sym}per {unit}
					</th>
				</tr>
			</thead>
			<tbody>
				{entries.map(([k, v]) => (
					<tr key={k} className="border-t border-neutral-100 dark:border-neutral-800">
						<td className="py-1.5 text-neutral-700 dark:text-neutral-300">{k}</td>
						<td className="py-1.5 text-right tabular-nums text-neutral-900 dark:text-neutral-100">
							{v.toFixed(v < 1 ? 4 : 2)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

interface TabLinkProps {
	value: Tab;
	current: Tab;
	onClick: (tab: Tab) => void;
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
					? "text-neutral-900 dark:text-neutral-100"
					: "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100",
			].join(" ")}
		>
			{children}
			{active && (
				<span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-500" />
			)}
		</button>
	);
}

function ModelDetailInner() {
	const { name } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/models/$name" });
	const { data: model } = useModel(name);
	const deleteModel = useDeleteModel();
	const { data: provider } = useQuery(
		providerDetailQueryOptions(model.spec.provider),
	);

	const dep = deprecationNote(model);
	const tags = model.spec.tags ?? [];
	const aliases = model.spec.aliases ?? [];
	const ctxTotal = model.spec.contextWindowTotal ?? model.spec.contextWindow;

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab }) });
	}

	async function handleDelete() {
		if (!window.confirm(`Delete model "${name}"? This cannot be undone.`)) return;
		try {
			await deleteModel.mutateAsync(name);
			toast("success", `Model "${name}" deleted.`);
			void navigate({ to: "/models" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete model.");
			}
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/models"
					className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Models
				</Link>
				<div className="mt-2 flex items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex items-center gap-2 min-w-0">
							<h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 truncate">
								{model.spec.displayName ?? model.metadata.name}
							</h1>
							{dep && (
								<AlertTriangle
									className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"
									aria-label={dep}
								/>
							)}
						</div>
						<div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
							<code className="font-mono">{model.metadata.name}</code>
							<span className="text-neutral-300 dark:text-neutral-700">·</span>
							<span>
								via{" "}
								<Link
									to="/providers/$name"
									params={{ name: model.spec.provider }}
									className="text-neutral-700 dark:text-neutral-300 hover:underline capitalize"
								>
									{model.spec.provider}
								</Link>
							</span>
							{aliases.length > 0 && (
								<>
									<span className="text-neutral-300 dark:text-neutral-700">·</span>
									<span className="truncate">aka {aliases.join(", ")}</span>
								</>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<Link
							to="/models/$name/edit"
							params={{ name }}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
						>
							<Pencil className="w-3.5 h-3.5" />
							Edit
						</Link>
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleteModel.isPending}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-red-600 dark:text-red-400 border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</button>
					</div>
				</div>
			</div>

			{dep && (
				<div className="flex items-start gap-2 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300">
					<AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
					<span>{dep}</span>
				</div>
			)}

			<div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1">
				<TabLink value="overview" current={search.tab} onClick={setTab}>
					Overview
				</TabLink>
				<TabLink value="pricing" current={search.tab} onClick={setTab}>
					Pricing
				</TabLink>
				<TabLink value="limits" current={search.tab} onClick={setTab}>
					Limits
				</TabLink>
			</div>

			{search.tab === "overview" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Section title="Identity">
						<dl>
							<FieldRow label="Display name">
								{dash(model.spec.displayName)}
							</FieldRow>
							<FieldRow label="Upstream name">
								<code className="text-xs font-mono">
									{dash(model.spec.upstreamName)}
								</code>
							</FieldRow>
							<FieldRow label="Family · version">
								{model.spec.family ? (
									<>
										{model.spec.family}
										{model.spec.version && ` · ${model.spec.version}`}
									</>
								) : (
									dash(undefined)
								)}
							</FieldRow>
							<FieldRow label="Release">{dash(model.spec.releaseDate)}</FieldRow>
							<FieldRow label="Knowledge cutoff">
								{dash(model.spec.knowledgeCutoff)}
							</FieldRow>
							<FieldRow label="Tags">
								{tags.length === 0 ? (
									dash(undefined)
								) : (
									<div className="flex flex-wrap gap-1.5">
										{tags.map((t) => (
											<span
												key={t}
												className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
											>
												#{t}
											</span>
										))}
									</div>
								)}
							</FieldRow>
						</dl>
					</Section>

					<div className="flex flex-col gap-4">
						<Section title="Provider">
							<ProviderCard name={model.spec.provider} provider={provider} />
						</Section>
						<Section title="Capabilities">
							<CapabilityChips cap={model.spec.capabilities} />
						</Section>
					</div>

					{model.spec.description && (
						<div className="lg:col-span-2">
							<Section title="Description">
								<p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
									{model.spec.description}
								</p>
							</Section>
						</div>
					)}
				</div>
			)}

			{search.tab === "pricing" && (
				<Section title="Pricing">
					<PricingTable model={model} />
				</Section>
			)}

			{search.tab === "limits" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<Section title="Context window">
						<dl>
							<FieldRow label="Total">
								<span className="tabular-nums">{fmtTokens(ctxTotal)}</span>
							</FieldRow>
							<FieldRow label="Input">
								<span className="tabular-nums">
									{fmtTokens(model.spec.contextWindowInput)}
								</span>
							</FieldRow>
							<FieldRow label="Output">
								<span className="tabular-nums">
									{fmtTokens(model.spec.contextWindowOutput)}
								</span>
							</FieldRow>
							<FieldRow label="Max output tokens">
								<span className="tabular-nums">
									{fmtTokens(model.spec.maxOutputTokens)}
								</span>
							</FieldRow>
						</dl>
					</Section>
					<Section title="Modalities">
						<dl>
							<FieldRow label="Input">
								{modalityList(model.spec.modalities, "input")}
							</FieldRow>
							<FieldRow label="Output">
								{modalityList(model.spec.modalities, "output")}
							</FieldRow>
						</dl>
					</Section>
				</div>
			)}
		</div>
	);
}

function ModelDetailPage() {
	return (
		<Suspense
			fallback={
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<ModelDetailInner />
		</Suspense>
	);
}
