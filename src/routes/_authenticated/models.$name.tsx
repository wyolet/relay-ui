import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	Braces,
	Brain,
	ChevronLeft,
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
} from "@/api/hooks/models";
import { ApiError } from "@/api/types/errors";
import type {
	Model,
	ModelCapabilities,
	ModelModalities,
} from "@/api/types/model";
import { confirm } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toast";

type Tab = "overview" | "pricing" | "limits";

const searchSchema = z.object({
	tab: z.enum(["overview", "pricing", "limits"]).default("overview"),
});

export const Route = createFileRoute("/_authenticated/models/$name")({
	validateSearch: searchSchema,
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(modelDetailQueryOptions(params.name)),
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

function activeCapabilities(cap: ModelCapabilities | undefined): string[] {
	if (!cap) return [];
	return Object.entries(cap)
		.filter(([, v]) => v === true)
		.map(([k]) => k);
}

function modalityList(
	m: ModelModalities | undefined,
	side: "input" | "output",
): string {
	const arr = m?.[side];
	if (!arr || arr.length === 0) return "—";
	return arr.join(", ");
}

function dash(v: string | number | null | undefined): React.ReactNode {
	if (v === null || v === undefined || v === "") {
		return <span className="text-muted-foreground/70">—</span>;
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
		<section className="rounded-lg border border-border bg-card">
			<header className="flex items-center justify-between px-4 h-9 border-b border-border">
				<h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-foreground min-w-0">{children}</dd>
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
			<span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-muted text-foreground">
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

function CapabilityChips({ cap }: { cap: ModelCapabilities | undefined }) {
	const active = activeCapabilities(cap);
	if (active.length === 0)
		return <span className="text-muted-foreground/70">—</span>;
	return (
		<div className="flex flex-wrap gap-1.5">
			{active.map((c) => (
				<CapabilityIcon key={c} name={c} />
			))}
		</div>
	);
}

function ProviderCard({ name }: { name: string }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
			<div className="min-w-0 flex items-center gap-2">
				<span className="text-sm font-medium text-foreground capitalize truncate">
					{name}
				</span>
			</div>
		</div>
	);
}

function PricingTable(_props: { model: Model }) {
	return <span className="text-muted-foreground/70">—</span>;
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

function ModelDetailInner() {
	const { name } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/models/$name" });
	const { data: model } = useModel(name);
	const deleteModel = useDeleteModel();

	const providerName =
		model.metadata.owner?.kind === "provider"
			? (model.metadata.owner.id ?? "")
			: "";
	const firstHostBinding = model.spec.hosts?.[0];

	const dep = deprecationNote(model);
	const tags = model.spec.tags ?? [];
	const aliases = model.spec.aliases ?? [];
	const ctxTotal = model.spec.contextWindowTotal;

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab }) });
	}

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete model ${name}?`,
			description: "This cannot be undone.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteModel.mutateAsync(model.metadata.id ?? "");
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
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Models
				</Link>
				<div className="mt-2 flex items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex items-center gap-2 min-w-0">
							<h1 className="text-xl font-semibold text-foreground truncate">
								{model.metadata.displayName ?? model.metadata.name}
							</h1>
							{dep && (
								<AlertTriangle
									className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"
									aria-label={dep}
								/>
							)}
						</div>
						<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
							<code className="font-mono">{model.metadata.name}</code>
							<span className="text-muted-foreground/50">·</span>
							{providerName && (
								<span>
									by{" "}
									<span className="text-foreground capitalize">
										{providerName}
									</span>
								</span>
							)}
							{aliases.length > 0 && (
								<>
									<span className="text-muted-foreground/50">·</span>
									<span className="truncate">aka {aliases.join(", ")}</span>
								</>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<Link
							to="/models/$name/edit"
							params={{ name }}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-foreground border border-border hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<Pencil className="w-3.5 h-3.5" />
							Edit
						</Link>
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleteModel.isPending}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-destructive border border-border hover:bg-destructive/10 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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

			<div className="border-b border-border flex items-center gap-1">
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
								{dash(model.metadata.displayName)}
							</FieldRow>
							<FieldRow label="Upstream name">
								<code className="text-xs font-mono">
									{dash(firstHostBinding?.upstreamName)}
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
							<FieldRow label="Release">
								{dash(model.spec.releaseDate)}
							</FieldRow>
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
												className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-medium bg-muted text-foreground"
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
							<ProviderCard name={providerName || "—"} />
						</Section>
						<Section title="Capabilities">
							<CapabilityChips cap={model.spec.capabilities} />
						</Section>
					</div>

					{model.metadata.description && (
						<div className="lg:col-span-2">
							<Section title="Description">
								<p className="text-sm text-foreground whitespace-pre-wrap">
									{model.metadata.description}
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
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<ModelDetailInner />
		</Suspense>
	);
}
