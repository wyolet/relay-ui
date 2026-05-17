import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Gauge,
	KeyRound,
	MoreHorizontal,
	Plus,
	ShieldCheck,
} from "lucide-react";
import { Suspense, useState } from "react";
import { z } from "zod";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	policiesListQueryOptions,
	useDeletePolicy,
	usePolicies,
	useUpdatePolicy,
} from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import {
	rateLimitsListQueryOptions,
	useAttachableRateLimits,
	useDeleteRateLimit,
	useRateLimits,
	useUpdateRateLimit,
} from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { Policy } from "@/api/types/policy";
import type { RateLimit } from "@/api/types/ratelimit";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import {
	usePolicyDiagnostics,
	useRateLimitDiagnostics,
} from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { confirm } from "@/shared/ConfirmDialog";
import { FilterDropdown } from "@/shared/FilterDropdown";
import { SearchBox } from "@/shared/SearchBox";
import { Switch } from "@/shared/Switch";
import { TableToolbar } from "@/shared/TableToolbar";
import { toast } from "@/shared/Toast";

type Tab = "policies" | "ratelimits";

type OwnerFilter = "user" | "host" | "all";

const OWNER_FILTER_OPTIONS: { value: OwnerFilter; label: string }[] = [
	{ value: "user", label: "User" },
	{ value: "host", label: "Host" },
	{ value: "all", label: "All" },
];

function matchesOwnerFilter(
	owner: { kind?: string } | undefined,
	filter: OwnerFilter,
): boolean {
	if (filter === "all") return true;
	const kind = owner?.kind ?? "user";
	return kind === filter;
}

function OwnerFilterSelect({
	value,
	onChange,
}: {
	value: OwnerFilter;
	onChange: (v: OwnerFilter) => void;
}) {
	return (
		<FilterDropdown
			label="Owner"
			value={value}
			options={OWNER_FILTER_OPTIONS}
			onChange={onChange}
		/>
	);
}

const searchSchema = z.object({
	tab: z.enum(["policies", "ratelimits"]).default("policies"),
});

export const Route = createFileRoute("/_authenticated/policies/")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
		]),
	component: PoliciesPage,
});

interface MenuAction {
	label: string;
	onClick: () => void;
	danger?: boolean;
}

function RowMenu({ actions }: { actions: MenuAction[] }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Row actions"
				className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<MoreHorizontal className="w-3.5 h-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-[160px]">
				{actions.map((a) => (
					<DropdownMenuItem
						key={a.label}
						variant={a.danger ? "destructive" : "default"}
						onClick={a.onClick}
					>
						{a.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function Th({
	children,
	align = "left",
}: {
	children: React.ReactNode;
	align?: "left" | "right";
}) {
	return (
		<th
			scope="col"
			className={`px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground ${
				align === "right" ? "text-right" : "text-left"
			}`}
		>
			{children}
		</th>
	);
}

function describeCatalog(p: Policy): {
	label: string;
	tone: "all" | "restricted" | "none";
} {
	const refs = p.spec.models ?? null;
	if (refs === null || refs.length === 0) {
		return { label: "All catalog", tone: "all" };
	}
	return {
		label: `${refs.length} grant${refs.length === 1 ? "" : "s"}`,
		tone: "restricted",
	};
}

function PoliciesPanel() {
	const { data: policiesData } = usePolicies();
	const rateLimits = useAttachableRateLimits();
	const deletePolicy = useDeletePolicy();
	const navigate = useNavigate({ from: "/policies" });
	const [q, setQ] = useState("");
	const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("user");
	const rawItems = policiesData.items ?? [];
	const allItems = rawItems.filter((p) =>
		matchesOwnerFilter(p.metadata.owner, ownerFilter),
	);
	const needle = q.trim().toLowerCase();
	const items = needle
		? allItems.filter((p) =>
				displayLabel(p.metadata).toLowerCase().includes(needle),
			)
		: allItems;

	const rateLimitById = new Map<string, RateLimit>();
	for (const rl of rateLimits) {
		if (rl.metadata.id) rateLimitById.set(rl.metadata.id, rl);
	}

	async function handleDelete(p: Policy) {
		const ok = await confirm({
			title: `Delete policy ${p.metadata.name}?`,
			description:
				"Relay keys using this policy will lose access until reattached.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deletePolicy.mutateAsync(p.metadata.id ?? "");
			toast("success", `Policy "${displayLabel(p.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof Error ? err.message : "Failed to delete policy.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox value={q} onChange={setQ} placeholder="Search policies" />
				}
				filters={
					<OwnerFilterSelect value={ownerFilter} onChange={setOwnerFilter} />
				}
				actions={
					<Link
						to="/policies/new"
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="w-3.5 h-3.5" />
						New policy
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<ShieldCheck className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{allItems.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No policies yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Bundle upstream secrets, allowed models, and rate limits — then
								attach to relay keys.
							</p>
							<Link
								to="/policies/new"
								className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors"
							>
								<Plus className="w-4 h-4" />
								Create your first policy
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No policies match the current filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th>Name</Th>
								<Th>Catalog</Th>
								<Th align="right">Host keys</Th>
								<Th>Rate limit</Th>
								<th
									scope="col"
									className="w-12 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
								>
									On
								</th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((p) => (
								<PolicyRow
									key={p.metadata.name}
									policy={p}
									rateLimit={
										p.spec.rateLimitId
											? rateLimitById.get(p.spec.rateLimitId)
											: undefined
									}
									onEdit={() =>
										void navigate({
											to: "/policies/$name",
											params: { name: p.metadata.name },
										})
									}
									onDelete={() => void handleDelete(p)}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function PolicyRow({
	policy,
	rateLimit,
	onEdit,
	onDelete,
}: {
	policy: Policy;
	rateLimit: RateLimit | undefined;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const updatePolicy = useUpdatePolicy(policy.metadata.id ?? "");
	const diagnostics = usePolicyDiagnostics(policy.metadata.id);
	const catalog = describeCatalog(policy);
	const enabled = policy.spec.enabled !== false;

	async function toggleEnabled(next: boolean) {
		try {
			await updatePolicy.mutateAsync({
				metadata: policy.metadata,
				spec: { ...policy.spec, enabled: next },
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to update policy.",
			);
		}
	}

	return (
		<tr className="border-t border-border hover:bg-muted/40 transition-colors">
			<td className="px-3 py-2">
				<Link
					to="/policies/$name"
					params={{ name: policy.metadata.name }}
					className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
				>
					<div className="flex items-center gap-2 text-sm font-medium text-foreground">
						<span>{displayLabel(policy.metadata)}</span>
						{!hasDisplayName(policy.metadata) && (
							<span className="text-[11px] text-muted-foreground">
								(no display name)
							</span>
						)}
						<DiagnosticDot diagnostics={diagnostics} />
					</div>
					{hasDisplayName(policy.metadata) && (
						<code className="font-mono text-[11px] text-muted-foreground">
							{policy.metadata.name}
						</code>
					)}
				</Link>
			</td>
			<td className="px-3 py-2">
				<span
					className={[
						"inline-flex items-center h-5 px-1.5 rounded text-[11px] font-medium",
						catalog.tone === "all"
							? "bg-muted text-muted-foreground"
							: "bg-primary/10 text-primary",
					].join(" ")}
				>
					{catalog.label}
				</span>
			</td>
			<td className="px-3 py-2 text-sm text-foreground text-right tabular-nums">
				{(policy.spec.hostKeyIds ?? []).length}
			</td>
			<td className="px-3 py-2 text-sm">
				{rateLimit ? (
					<Link
						to="/policies/rate-limits/$name"
						params={{ name: rateLimit.metadata.name }}
						className="text-foreground hover:underline"
					>
						{displayLabel(rateLimit.metadata)}
					</Link>
				) : (policy.spec.rlBindings ?? []).length > 0 ? (
					<span className="text-muted-foreground">
						{(policy.spec.rlBindings ?? []).length} rate limits
					</span>
				) : (
					<span className="text-muted-foreground/70">—</span>
				)}
			</td>
			<td className="px-3 py-2">
				<Switch
					checked={enabled}
					onChange={(next) => void toggleEnabled(next)}
					disabled={updatePolicy.isPending}
					label={`Toggle ${policy.metadata.name}`}
				/>
			</td>
			<td className="px-3 py-2 text-right">
				<RowMenu
					actions={[
						{ label: "Edit", onClick: onEdit },
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</td>
		</tr>
	);
}

function fmtWindow(ns: number): string {
	const seconds = Math.round(ns / 1_000_000_000);
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
	if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`;
	return `${Math.round(seconds / 86_400)}d`;
}

function fmtAmount(n: number): string {
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}k`;
	return String(n);
}

function RateLimitsPanel() {
	const { data: rateLimitsData } = useRateLimits();
	const deleteRL = useDeleteRateLimit();
	const navigate = useNavigate({ from: "/policies" });
	const [q, setQ] = useState("");
	const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("user");
	const rawItems = rateLimitsData.items ?? [];
	const allItems = rawItems.filter((rl) =>
		matchesOwnerFilter(rl.metadata.owner, ownerFilter),
	);
	const needle = q.trim().toLowerCase();
	const items = needle
		? allItems.filter((rl) =>
				displayLabel(rl.metadata).toLowerCase().includes(needle),
			)
		: allItems;

	async function handleDelete(rl: RateLimit) {
		const ok = await confirm({
			title: `Delete rate limit ${rl.metadata.name}?`,
			description: "Policies and models that reference it will lose this rule.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteRL.mutateAsync(rl.metadata.id ?? "");
			toast("success", `Rate limit "${displayLabel(rl.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof Error ? err.message : "Failed to delete rate limit.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox
						value={q}
						onChange={setQ}
						placeholder="Search rate limits"
					/>
				}
				filters={
					<OwnerFilterSelect value={ownerFilter} onChange={setOwnerFilter} />
				}
				actions={
					<Link
						to="/policies/rate-limits/new"
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="w-3.5 h-3.5" />
						New rate limit
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Gauge className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{allItems.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No rate limits yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Define a limit and attach it to policies or models.
							</p>
							<Link
								to="/policies/rate-limits/new"
								className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors"
							>
								<Plus className="w-4 h-4" />
								Create your first rate limit
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No rate limits match the current filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th>Name</Th>
								<Th>Strategy</Th>
								<Th align="right">Window</Th>
								<Th>Rules</Th>
								<th
									scope="col"
									className="w-12 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
								>
									On
								</th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((rl) => (
								<RateLimitRow
									key={rl.metadata.name}
									rl={rl}
									onEdit={() =>
										void navigate({
											to: "/policies/rate-limits/$name",
											params: { name: rl.metadata.name },
										})
									}
									onDelete={() => void handleDelete(rl)}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function RateLimitRow({
	rl,
	onEdit,
	onDelete,
}: {
	rl: RateLimit;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const updateRL = useUpdateRateLimit(rl.metadata.id ?? "");
	const diagnostics = useRateLimitDiagnostics(rl.metadata.id);
	const enabled = rl.spec.enabled !== false;
	async function toggleEnabled(next: boolean) {
		try {
			await updateRL.mutateAsync({
				metadata: rl.metadata,
				spec: { ...rl.spec, enabled: next },
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update rate limit.",
			);
		}
	}
	return (
		<tr className="border-t border-border hover:bg-muted/40 transition-colors">
			<td className="px-3 py-2">
				<div className="flex items-center gap-2">
					<Link
						to="/policies/rate-limits/$name"
						params={{ name: rl.metadata.name }}
						className="text-sm font-medium text-foreground hover:underline"
					>
						{displayLabel(rl.metadata)}
						{!hasDisplayName(rl.metadata) && (
							<span className="ml-1.5 text-[11px] text-muted-foreground">
								(no display name)
							</span>
						)}
					</Link>
					<DiagnosticDot diagnostics={diagnostics} />
				</div>
			</td>
			<td className="px-3 py-2 text-sm">
				<span className="text-[11px] text-muted-foreground">
					{rl.spec.rules?.[0]?.strategy ?? "—"}
				</span>
			</td>
			<td className="px-3 py-2 text-right text-sm text-foreground tabular-nums">
				{rl.spec.rules?.[0] ? fmtWindow(rl.spec.rules[0].window) : "—"}
			</td>
			<td className="px-3 py-2 text-sm text-muted-foreground">
				{summarizeRules(rl)}
			</td>
			<td className="px-3 py-2">
				<Switch
					checked={enabled}
					onChange={(next) => void toggleEnabled(next)}
					disabled={updateRL.isPending}
					label={`Toggle ${rl.metadata.name}`}
				/>
			</td>
			<td className="px-3 py-2 text-right">
				<RowMenu
					actions={[
						{ label: "Edit", onClick: onEdit },
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</td>
		</tr>
	);
}

function summarizeRules(rl: RateLimit): string {
	const rules = rl.spec.rules ?? null;
	if (!rules || rules.length === 0) {
		return "—";
	}
	if (rules.length === 1) {
		return `${fmtAmount(rules[0].amount)} ${rules[0].meter}`;
	}
	return `${rules.length} rules · ${rules
		.slice(0, 2)
		.map((r) => r.meter)
		.join(", ")}${rules.length > 2 ? "…" : ""}`;
}

function PoliciesPage() {
	const navigate = useNavigate({ from: "/policies" });
	const search = Route.useSearch();

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab }) });
	}

	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<div>
				<div className="mb-4 flex items-start gap-2">
					<KeyRound className="hidden" aria-hidden="true" />
					<div>
						<h1 className="text-lg font-semibold text-foreground">Policies</h1>
						<p className="text-xs text-muted-foreground mt-0.5">
							Bundle upstream credentials, allowed models, and rate limits, then
							attach to relay keys.
						</p>
					</div>
				</div>
				<Tabs
					value={search.tab}
					onValueChange={(v) => setTab((v ?? "policies") as Tab)}
					className="mb-4"
				>
					<TabsList variant="underline">
						<TabsTrigger value="policies" className="px-3 h-9">
							Policies
						</TabsTrigger>
						<TabsTrigger value="ratelimits" className="px-3 h-9">
							Rate limits
						</TabsTrigger>
					</TabsList>
				</Tabs>
				{search.tab === "policies" && <PoliciesPanel />}
				{search.tab === "ratelimits" && <RateLimitsPanel />}
			</div>
		</Suspense>
	);
}
