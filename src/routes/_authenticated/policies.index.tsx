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
import { useModels } from "@/api/hooks/models";
import {
	policiesListQueryOptions,
	useDeletePolicy,
	usePolicies,
} from "@/api/hooks/policies";
import {
	rateLimitsListQueryOptions,
	useDeleteRateLimit,
	useRateLimits,
} from "@/api/hooks/ratelimits";
import type { RateLimit } from "@/api/types/ratelimit";
import { confirm } from "@/components/ConfirmDialog";
import { RateLimitModal } from "@/components/RateLimitModal";
import { Switch } from "@/components/Switch";
import { toast } from "@/components/Toast";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Tab = "policies" | "ratelimits";

const searchSchema = z.object({
	tab: z.enum(["policies", "ratelimits"]).default("policies"),
});

export const Route = createFileRoute("/_authenticated/policies/")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
		]),
	component: PoliciesPage,
});

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

function PoliciesPanel() {
	const { data: policiesData } = usePolicies();
	const { data: modelsData } = useModels();
	const deletePolicy = useDeletePolicy();
	const navigate = useNavigate({ from: "/policies" });
	const items = policiesData.items ?? [];

	function modelCountFor(provider: string): number {
		return (modelsData.items ?? []).filter((m) => m.spec.provider === provider)
			.length;
	}

	async function handleDelete(name: string) {
		const ok = await confirm({
			title: `Delete policy ${name}?`,
			description:
				"Relay keys using this policy will lose access until reattached.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deletePolicy.mutateAsync(name);
			toast("success", `Policy "${name}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof Error ? err.message : "Failed to delete policy.",
			);
		}
	}

	return (
		<div>
			<div className="flex items-center justify-end mb-3">
				<button
					type="button"
					onClick={() => void navigate({ to: "/policies/new" })}
					className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Plus className="w-3.5 h-3.5" />
					New policy
				</button>
			</div>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<ShieldCheck className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					<p className="text-sm font-medium text-foreground mb-1">
						No policies yet
					</p>
					<p className="text-sm text-muted-foreground mb-5">
						Bundle upstream secrets, allowed models, and rate limits — then
						attach to relay keys.
					</p>
					<button
						type="button"
						onClick={() => void navigate({ to: "/policies/new" })}
						className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors"
					>
						<Plus className="w-4 h-4" />
						Create your first policy
					</button>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th>Name</Th>
								<Th>Provider</Th>
								<Th align="right">Secrets</Th>
								<Th align="right">Models</Th>
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
								<tr
									key={p.metadata.name}
									className="border-t border-border hover:bg-muted/40 transition-colors"
								>
									<td className="px-3 py-2">
										<Link
											to="/policies/$name"
											params={{ name: p.metadata.name }}
											className="text-sm font-medium text-foreground hover:underline"
										>
											{p.metadata.name}
										</Link>
									</td>
									<td className="px-3 py-2 text-sm text-foreground capitalize">
										<Link
											to="/providers/$name"
											params={{ name: p.spec.provider }}
											className="hover:underline"
										>
											{p.spec.provider}
										</Link>
									</td>
									<td className="px-3 py-2 text-sm text-foreground text-right tabular-nums">
										{(p.spec.secrets ?? []).length}
									</td>
									<td className="px-3 py-2 text-sm text-foreground text-right tabular-nums">
										{modelCountFor(p.spec.provider)}
									</td>
									<td className="px-3 py-2">
										<Switch
											checked
											onChange={() =>
												toast(
													"success",
													"Policy enable/disable — backend support coming soon.",
												)
											}
											label={`Toggle ${p.metadata.name}`}
										/>
									</td>
									<td className="px-3 py-2 text-right">
										<RowMenu
											actions={[
												{
													label: "Edit",
													onClick: () =>
														void navigate({
															to: "/policies/$name",
															params: { name: p.metadata.name },
														}),
												},
												{
													label: "Delete",
													danger: true,
													onClick: () => void handleDelete(p.metadata.name),
												},
											]}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function fmtWindow(seconds: number): string {
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
	const { data } = useRateLimits();
	const deleteRL = useDeleteRateLimit();
	const items = data.items ?? [];
	const [createOpen, setCreateOpen] = useState(false);
	const [editName, setEditName] = useState<string | null>(null);
	const editingRL = editName
		? (items.find((rl) => rl.metadata.name === editName) ?? null)
		: null;

	async function handleDelete(rl: RateLimit) {
		const ok = await confirm({
			title: `Delete rate limit ${rl.metadata.name}?`,
			description: "Policies and models that reference it will lose this rule.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteRL.mutateAsync(rl.metadata.name);
			toast("success", `Rate limit "${rl.metadata.name}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof Error ? err.message : "Failed to delete rate limit.",
			);
		}
	}

	return (
		<div>
			<div className="flex items-center justify-end mb-3">
				<button
					type="button"
					onClick={() => setCreateOpen(true)}
					className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Plus className="w-3.5 h-3.5" />
					New rate limit
				</button>
			</div>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Gauge className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					<p className="text-sm font-medium text-foreground mb-1">
						No rate limits yet
					</p>
					<p className="text-sm text-muted-foreground mb-5">
						Define a limit and attach it to policies or models.
					</p>
					<button
						type="button"
						onClick={() => setCreateOpen(true)}
						className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors"
					>
						<Plus className="w-4 h-4" />
						Create your first rate limit
					</button>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th>Name</Th>
								<Th>Strategy</Th>
								<Th align="right">Amount</Th>
								<Th align="right">Window</Th>
								<Th>Source</Th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((rl) => (
								<tr
									key={rl.metadata.name}
									className="border-t border-border hover:bg-muted/40 transition-colors"
								>
									<td className="px-3 py-2">
										<button
											type="button"
											onClick={() => setEditName(rl.metadata.name)}
											className="text-sm font-medium text-foreground hover:underline"
										>
											{rl.metadata.name}
										</button>
									</td>
									<td className="px-3 py-2 text-sm">
										<span className="text-[11px] text-muted-foreground">
											{rl.spec.strategy}
										</span>
									</td>
									<td className="px-3 py-2 text-right text-sm text-foreground tabular-nums">
										{fmtAmount(rl.spec.amount ?? 0)}
									</td>
									<td className="px-3 py-2 text-right text-sm text-foreground tabular-nums">
										{fmtWindow(rl.spec.window)}
									</td>
									<td className="px-3 py-2 text-sm text-muted-foreground">
										{rl.spec.source ?? "—"}
									</td>
									<td className="px-3 py-2 text-right">
										<RowMenu
											actions={[
												{
													label: "Edit",
													onClick: () => setEditName(rl.metadata.name),
												},
												{
													label: "Delete",
													danger: true,
													onClick: () => void handleDelete(rl),
												},
											]}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<RateLimitModal open={createOpen} onClose={() => setCreateOpen(false)} />
			<RateLimitModal
				open={editName !== null}
				onClose={() => setEditName(null)}
				rateLimit={editingRL ?? undefined}
			/>
		</div>
	);
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
				<div className="border-b border-border flex items-center gap-1 mb-4">
					<TabLink value="policies" current={search.tab} onClick={setTab}>
						Policies
					</TabLink>
					<TabLink value="ratelimits" current={search.tab} onClick={setTab}>
						Rate limits
					</TabLink>
				</div>
				{search.tab === "policies" && <PoliciesPanel />}
				{search.tab === "ratelimits" && <RateLimitsPanel />}
			</div>
		</Suspense>
	);
}
