import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, KeyRound, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { policiesListQueryOptions, usePolicies } from "@/api/hooks/policies";
import {
	hostKeysListQueryOptions,
	useDeleteHostKey,
	useHostKeys,
} from "@/api/hooks/hostkeys";
import { ApiError } from "@/api/types/errors";
import type { HostKey } from "@/api/types/hostkey";
import { confirm } from "@/components/ConfirmDialog";
import { CreateRelayKeyModal } from "@/components/CreateRelayKeyModal";
import { EditRelayKeyModal } from "@/components/EditRelayKeyModal";
import { SearchBox } from "@/components/SearchBox";
import { TableToolbar } from "@/components/TableToolbar";
import { toast } from "@/components/Toast";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { type ApiKey, useKeysStore } from "@/stores/keys";

type Filter = "active" | "revoked" | "all";
type Tab = "relay" | "provider";

const searchSchema = z.object({
	tab: z.enum(["relay", "provider"]).default("relay"),
	filter: z.enum(["active", "revoked", "all"]).default("active"),
	q: z.string().default(""),
});

export const Route = createFileRoute("/_authenticated/keys")({
	validateSearch: searchSchema,
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(policiesListQueryOptions);
		void context.queryClient.prefetchQuery(hostKeysListQueryOptions);
		return null;
	},
	component: KeysPage,
});

function timeAgo(iso: string | null): string {
	if (iso === null) return "—";
	const t = new Date(iso).getTime();
	const diff = Date.now() - t;
	const sec = Math.round(diff / 1_000);
	if (sec < 60) return `${sec}s ago`;
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.round(hr / 24);
	if (day < 30) return `${day}d ago`;
	const mo = Math.round(day / 30);
	return `${mo}mo ago`;
}

function applyFilter(items: ApiKey[], filter: Filter, q: string): ApiKey[] {
	const needle = q.trim().toLowerCase();
	return items.filter((k) => {
		if (filter === "active" && k.revokedAt !== null) return false;
		if (filter === "revoked" && k.revokedAt === null) return false;
		if (needle.length === 0) return true;
		return (
			k.name.toLowerCase().includes(needle) ||
			k.prefix.toLowerCase().includes(needle)
		);
	});
}

interface MenuAction {
	label: string;
	onClick: () => void;
	danger?: boolean;
	disabled?: boolean;
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
			<DropdownMenuContent align="end" className="min-w-[180px]">
				{actions.map((a) => (
					<DropdownMenuItem
						key={a.label}
						disabled={a.disabled}
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

function PrefixCell({ text, copyText }: { text: string; copyText: string }) {
	const [copied, setCopied] = useState(false);
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(copyText);
			setCopied(true);
			setTimeout(() => setCopied(false), 1_200);
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}
	return (
		<button
			type="button"
			onClick={() => void handleCopy()}
			title="Copy prefix"
			className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted hover:bg-muted/60 transition-colors"
		>
			<span>{text}</span>
			{copied ? (
				<Check className="w-3 h-3 text-brand-600 dark:text-brand-400" />
			) : (
				<Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
			)}
		</button>
	);
}

function formatAmount(n: number): string {
	if (n >= 1_000_000)
		return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}k`;
	return `${n}`;
}

function formatWindow(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
	if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`;
	return `${Math.round(seconds / 86_400)}d`;
}

function LimitsCell({
	rateLimit,
}: {
	rateLimit: import("@/stores/keys").RateLimitDraft;
}) {
	if (rateLimit.kind === "none") {
		return <span className="text-[11px] text-muted-foreground/70">—</span>;
	}
	if (rateLimit.kind === "ref") {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-brand-600/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-medium">
				{rateLimit.name || "(unset)"}
			</span>
		);
	}
	const parts: string[] = [];
	if (rateLimit.requests)
		parts.push(
			`${formatAmount(rateLimit.requests.amount)}/${formatWindow(rateLimit.requests.window)} req`,
		);
	if (rateLimit.tokens)
		parts.push(
			`${formatAmount(rateLimit.tokens.amount)}/${formatWindow(rateLimit.tokens.window)} tok`,
		);
	if (rateLimit.concurrency) parts.push(`${rateLimit.concurrency.amount} conc`);
	if (rateLimit.spend)
		parts.push(
			`$${rateLimit.spend.amount}/${formatWindow(rateLimit.spend.window)}`,
		);
	if (parts.length === 0) {
		return (
			<span className="text-[11px] text-muted-foreground/70">
				custom (empty)
			</span>
		);
	}
	return (
		<span className="text-[11px] font-mono text-muted-foreground">
			{parts.join(" · ")}
		</span>
	);
}

function formatExpires(iso: string | null): string {
	if (iso === null) return "Never";
	const t = new Date(iso).getTime();
	const diff = t - Date.now();
	if (diff < 0) return "Expired";
	const day = Math.round(diff / 86_400_000);
	if (day < 1) return "<1d";
	if (day < 60) return `in ${day}d`;
	const mo = Math.round(day / 30);
	return `in ${mo}mo`;
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

type StatusTone = "active" | "muted" | "danger" | "warn";

function StatusDot({ tone, label }: { tone: StatusTone; label: string }) {
	const cls = {
		active:
			"bg-emerald-500 shadow-[0_0_6px_rgb(16_185_129_/_0.7)] dark:shadow-[0_0_8px_rgb(16_185_129_/_0.5)]",
		muted: "bg-neutral-400 dark:bg-neutral-600",
		danger:
			"bg-red-500 shadow-[0_0_6px_rgb(239_68_68_/_0.7)] dark:shadow-[0_0_8px_rgb(239_68_68_/_0.5)]",
		warn: "bg-amber-500 shadow-[0_0_6px_rgb(245_158_11_/_0.7)] dark:shadow-[0_0_8px_rgb(245_158_11_/_0.5)]",
	}[tone];
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className={`inline-block w-2 h-2 rounded-full ${cls}`}
		/>
	);
}

function KeysPage() {
	const navigate = useNavigate({ from: "/keys" });
	const search = Route.useSearch();

	function setTab(tab: Tab) {
		void navigate({ search: (prev) => ({ ...prev, tab }) });
	}

	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Keys</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Relay API keys and the upstream provider credentials they draw from.
				</p>
			</div>

			<div className="border-b border-border flex items-center gap-1 mb-4">
				<TabLink value="relay" current={search.tab} onClick={setTab}>
					Relay keys
				</TabLink>
				<TabLink value="provider" current={search.tab} onClick={setTab}>
					Host keys
				</TabLink>
			</div>

			{search.tab === "relay" && <RelayKeysPanel />}
			{search.tab === "provider" && <HostKeysPanel />}
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

function RelayKeysPanel() {
	const navigate = useNavigate({ from: "/keys" });
	const search = Route.useSearch();
	const items = useKeysStore((s) => s.items);
	const revoke = useKeysStore((s) => s.revoke);
	const [createOpen, setCreateOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);

	const visible = applyFilter(items, search.filter, search.q);
	const editKey = editId ? (items.find((k) => k.id === editId) ?? null) : null;

	function setFilter(filter: Filter) {
		void navigate({ search: (prev) => ({ ...prev, filter }) });
	}
	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }) });
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox
						value={search.q}
						onChange={setQ}
						placeholder="Search keys"
					/>
				}
				filters={
					<Select
						value={search.filter}
						onValueChange={(v) => {
							if (v !== null) setFilter(v as Filter);
						}}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="revoked">Revoked</SelectItem>
							<SelectItem value="all">All</SelectItem>
						</SelectContent>
					</Select>
				}
				actions={
					<button
						type="button"
						onClick={() => setCreateOpen(true)}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="w-3.5 h-3.5" />
						New key
					</button>
				}
			/>

			{visible.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<KeyRound className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{items.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No keys yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Create a key for the first app that calls this relay.
							</p>
							<button
								type="button"
								onClick={() => setCreateOpen(true)}
								className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors"
							>
								<Plus className="w-4 h-4" />
								Create your first key
							</button>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No keys match this filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<th scope="col" className="w-6 px-3 py-2" aria-label="Status" />
								<Th>Name</Th>
								<Th>Prefix</Th>
								<Th>Limits</Th>
								<Th align="right">Last used</Th>
								<Th align="right">Created</Th>
								<Th align="right">Expires</Th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{visible.map((k) => {
								const revoked = k.revokedAt !== null;
								const expired =
									k.expiresAt !== null &&
									new Date(k.expiresAt).getTime() < Date.now();
								const status: { tone: StatusTone; label: string } = revoked
									? { tone: "muted", label: "Revoked" }
									: expired
										? { tone: "warn", label: "Expired" }
										: { tone: "active", label: "Active" };
								async function doRevoke() {
									const ok = await confirm({
										title: `Revoke ${k.name}?`,
										description:
											"Apps using this key will start returning 401.",
										confirmLabel: "Revoke",
										danger: true,
									});
									if (ok) {
										revoke(k.id);
										toast("success", `"${k.name}" revoked.`);
									}
								}
								return (
									<tr
										key={k.id}
										className={[
											"border-t border-border transition-colors",
											revoked || expired
												? "bg-muted/30 text-muted-foreground/70"
												: "hover:bg-muted/40",
										].join(" ")}
									>
										<td className="px-3 py-2 align-middle">
											<StatusDot tone={status.tone} label={status.label} />
										</td>
										<td className="px-3 py-2">
											<Link
												to="/keys/$id"
												params={{ id: k.id }}
												className={[
													"text-sm font-medium hover:underline",
													revoked || expired
														? "text-neutral-500 dark:text-neutral-500 line-through decoration-neutral-400/60"
														: "text-foreground",
												].join(" ")}
											>
												{k.name}
											</Link>
										</td>
										<td className="px-3 py-2">
											<PrefixCell text={`${k.prefix}…`} copyText={k.prefix} />
										</td>
										<td className="px-3 py-2">
											<LimitsCell rateLimit={k.rateLimit} />
										</td>
										<td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
											{timeAgo(k.lastUsedAt)}
										</td>
										<td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
											{timeAgo(k.createdAt)}
										</td>
										<td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
											{formatExpires(k.expiresAt)}
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														onClick: () => setEditId(k.id),
													},
													{
														label: revoked ? "Revoked" : "Revoke",
														disabled: revoked,
														danger: !revoked,
														onClick: doRevoke,
													},
												]}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<CreateRelayKeyModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
			/>
			<EditRelayKeyModal
				open={editId !== null}
				keyItem={editKey}
				onClose={() => setEditId(null)}
			/>
		</div>
	);
}

function HostKeysPanel() {
	const navigate = useNavigate({ from: "/keys" });
	const { data: hostKeysData } = useHostKeys();
	const { data: policiesData } = usePolicies();
	const deleteHostKey = useDeleteHostKey();
	const [q, setQ] = useState("");

	const allItems = hostKeysData.items ?? [];
	const needle = q.trim().toLowerCase();
	const items = needle
		? allItems.filter(
				(hk) =>
					displayLabel(hk.metadata).toLowerCase().includes(needle) ||
					hk.metadata.name.toLowerCase().includes(needle) ||
					(hk.spec.valueFrom.env?.toLowerCase().includes(needle) ?? false),
			)
		: allItems;

	const refCounts = new Map<string, number>();
	for (const policy of policiesData.items ?? []) {
		for (const id of policy.spec.hostKeyIds ?? []) {
			refCounts.set(id, (refCounts.get(id) ?? 0) + 1);
		}
	}

	async function handleDelete(hk: HostKey) {
		const ok = await confirm({
			title: `Delete host key ${displayLabel(hk.metadata)}?`,
			description:
				"Policies referencing this key will lose access until you reattach another.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteHostKey.mutateAsync(hk.metadata.id ?? "");
			toast("success", `Host key "${displayLabel(hk.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete host key.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox value={q} onChange={setQ} placeholder="Search host keys" />
				}
				actions={
					<Link
						to="/host-keys/new"
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="w-3.5 h-3.5" />
						New host key
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<KeyRound className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{allItems.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No host keys yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Register upstream credentials — stored encrypted by Relay or
								sourced from an env var.
							</p>
							<Link
								to="/host-keys/new"
								className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors"
							>
								<Plus className="w-4 h-4" />
								Create your first host key
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No host keys match the current filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th>Name</Th>
								<Th>Source</Th>
								<Th>Env var</Th>
								<Th align="right">References</Th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((hk) => {
								const isStored = hk.spec.valueFrom.kind === "stored";
								const refCount = refCounts.get(hk.metadata.id ?? "") ?? 0;
								return (
									<tr
										key={hk.metadata.name}
										className="border-t border-border hover:bg-muted/40 transition-colors"
									>
										<td className="px-3 py-2">
											<Link
												to="/host-keys/$name"
												params={{ name: hk.metadata.name }}
												className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
											>
												<div className="text-sm font-medium text-foreground">
													{displayLabel(hk.metadata)}
												</div>
												{hasDisplayName(hk.metadata) && (
													<div className="font-mono text-[11px] text-muted-foreground">
														{hk.metadata.name}
													</div>
												)}
											</Link>
										</td>
										<td className="px-3 py-2 text-sm text-foreground">
											{isStored ? "Stored" : "Env"}
										</td>
										<td className="px-3 py-2 text-sm">
											{hk.spec.valueFrom.env ? (
												<span className="font-mono text-foreground">
													{hk.spec.valueFrom.env}
												</span>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</td>
										<td className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
											{refCount}
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														onClick: () =>
															void navigate({
																to: "/host-keys/$name/edit",
																params: { name: hk.metadata.name },
															}),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () => void handleDelete(hk),
													},
												]}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
