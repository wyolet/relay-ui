import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, KeyRound, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import {
	hostKeysListQueryOptions,
	useDeleteHostKey,
	useHostKeys,
} from "@/api/hooks/hostkeys";
import { hostsListQueryOptions, useHosts } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions, usePolicies } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import {
	relayKeysListQueryOptions,
	useDeleteRelayKey,
	useRelayKeys,
	useUpdateRelayKey,
} from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { HostKey } from "@/api/types/hostkey";
import type { RelayKey } from "@/api/types/relayKey";
import { confirm } from "@/components/ConfirmDialog";
import { SearchBox } from "@/components/SearchBox";
import { Switch } from "@/components/Switch";
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
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import {
	useHostKeyDiagnostics,
	useRelayKeyDiagnostics,
} from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

function RelayKeyDiagDot({ id }: { id: string | undefined }) {
	const diagnostics = useRelayKeyDiagnostics(id);
	return <DiagnosticDot diagnostics={diagnostics} />;
}

function HostKeyDiagDot({ id }: { id: string | undefined }) {
	const diagnostics = useHostKeyDiagnostics(id);
	return <DiagnosticDot diagnostics={diagnostics} />;
}

type Filter = "active" | "revoked" | "all";

const FILTER_LABELS: Record<Filter, string> = {
	active: "Active",
	revoked: "Revoked",
	all: "All",
};
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
		void context.queryClient.prefetchQuery(hostsListQueryOptions);
		void context.queryClient.prefetchQuery(relayKeysListQueryOptions);
		void context.queryClient.prefetchQuery(modelsListQueryOptions);
		void context.queryClient.prefetchQuery(rateLimitsListQueryOptions);
		void context.queryClient.prefetchQuery(providersListQueryOptions);
		return null;
	},
	component: KeysPage,
});

interface MenuAction {
	label: string;
	onClick?: () => void;
	/** Render the menu item as another element (e.g. a TanStack <Link>). */
	render?: React.ReactElement;
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
						render={a.render}
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

function relayStatus(rk: RelayKey): { tone: StatusTone; label: string } {
	if (rk.spec.revokedAt) return { tone: "danger", label: "Revoked" };
	if (rk.spec.enabled === false) return { tone: "warn", label: "Disabled" };
	return { tone: "active", label: "Active" };
}

function isRelayKeyRevoked(rk: RelayKey): boolean {
	return Boolean(rk.spec.revokedAt) || rk.spec.enabled === false;
}

function RelayKeysPanel() {
	const navigate = useNavigate({ from: "/keys" });
	const search = Route.useSearch();
	const { data: relayKeysData } = useRelayKeys();
	const { data: policiesData } = usePolicies();
	const updateRelayKey = useUpdateRelayKey();
	const deleteRelayKey = useDeleteRelayKey();

	const policyLabels = new Map<string, string>();
	for (const p of policiesData.items ?? []) {
		if (p.metadata.id)
			policyLabels.set(p.metadata.id, displayLabel(p.metadata));
	}

	const allItems = relayKeysData.items ?? [];
	const needle = search.q.trim().toLowerCase();
	const items = allItems.filter((rk) => {
		const revoked = isRelayKeyRevoked(rk);
		if (search.filter === "active" && revoked) return false;
		if (search.filter === "revoked" && !revoked) return false;
		if (!needle) return true;
		return (
			displayLabel(rk.metadata).toLowerCase().includes(needle) ||
			rk.metadata.name.toLowerCase().includes(needle) ||
			(rk.spec.prefix ?? "").toLowerCase().includes(needle)
		);
	});

	function setFilter(filter: Filter) {
		void navigate({ search: (prev) => ({ ...prev, filter }) });
	}
	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }) });
	}

	async function handleToggleEnabled(rk: RelayKey, nextEnabled: boolean) {
		try {
			await updateRelayKey.mutateAsync({
				id: rk.metadata.id ?? "",
				body: {
					metadata: rk.metadata,
					spec: { ...rk.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Relay key "${displayLabel(rk.metadata)}" ${nextEnabled ? "enabled" : "disabled"}.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update relay key.",
			);
		}
	}

	async function handleDelete(rk: RelayKey) {
		const ok = await confirm({
			title: `Delete ${displayLabel(rk.metadata)}?`,
			description: "Apps using this key will start returning 401.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteRelayKey.mutateAsync(rk.metadata.id ?? "");
			toast("success", `Relay key "${displayLabel(rk.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete relay key.",
			);
		}
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
							<SelectValue>{FILTER_LABELS[search.filter]}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
								<SelectItem key={f} value={f}>
									{FILTER_LABELS[f]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
				actions={
					<Link
						to="/relay-keys/new"
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="w-3.5 h-3.5" />
						New key
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<KeyRound className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{allItems.length === 0 ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No keys yet
							</p>
							<p className="text-sm text-muted-foreground mb-5">
								Create a key for the first app that calls this relay.
							</p>
							<Link
								to="/relay-keys/new"
								className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors"
							>
								<Plus className="w-4 h-4" />
								Create your first key
							</Link>
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
								<Th>Policy</Th>
								<Th>Passthrough</Th>
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
							{items.map((rk) => {
								const status = relayStatus(rk);
								const revoked = isRelayKeyRevoked(rk);
								const enabled = rk.spec.enabled ?? true;
								const policyLabel =
									policyLabels.get(rk.spec.policyId) ??
									`Unknown (${rk.spec.policyId.slice(0, 6)}…)`;
								return (
									<tr
										key={rk.metadata.name}
										className={[
											"border-t border-border transition-colors",
											revoked
												? "bg-muted/30 text-muted-foreground/70"
												: "hover:bg-muted/40",
										].join(" ")}
									>
										<td className="px-3 py-2 align-middle">
											<StatusDot tone={status.tone} label={status.label} />
										</td>
										<td className="px-3 py-2">
											<div className="flex items-center gap-2">
												<Link
													to="/relay-keys/$name"
													params={{ name: rk.metadata.name }}
													className={[
														"text-sm font-medium hover:underline",
														revoked
															? "text-neutral-500 dark:text-neutral-500"
															: "text-foreground",
													].join(" ")}
												>
													{displayLabel(rk.metadata)}
												</Link>
												<RelayKeyDiagDot id={rk.metadata.id} />
											</div>
											{hasDisplayName(rk.metadata) && (
												<div className="font-mono text-[11px] text-muted-foreground">
													{rk.metadata.name}
												</div>
											)}
										</td>
										<td className="px-3 py-2">
											{rk.spec.prefix ? (
												<PrefixCell
													text={`${rk.spec.prefix}…`}
													copyText={rk.spec.prefix}
												/>
											) : (
												<span className="text-[11px] text-muted-foreground/70">
													—
												</span>
											)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{policyLabel}
										</td>
										<td className="px-3 py-2 text-xs text-muted-foreground">
											{rk.spec.passthroughAllowed ? "Allowed" : "—"}
										</td>
										<td className="px-3 py-2">
											<Switch
												checked={enabled}
												onChange={(next) =>
													void handleToggleEnabled(rk, next)
												}
												disabled={revoked}
												label={`Toggle ${rk.metadata.name}`}
											/>
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/relay-keys/$name/edit"
																params={{ name: rk.metadata.name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () => void handleDelete(rk),
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

function HostKeysPanel() {
	const { data: hostKeysData } = useHostKeys();
	const { data: hostsData } = useHosts();
	const { data: policiesData } = usePolicies();
	const deleteHostKey = useDeleteHostKey();
	const [q, setQ] = useState("");

	const hostLabels = new Map<string, string>();
	for (const h of hostsData.items ?? []) {
		if (h.metadata.id) hostLabels.set(h.metadata.id, displayLabel(h.metadata));
	}
	const policyLabels = new Map<string, string>();
	for (const p of policiesData.items ?? []) {
		if (p.metadata.id) policyLabels.set(p.metadata.id, displayLabel(p.metadata));
	}

	const allItems = hostKeysData.items ?? [];
	const needle = q.trim().toLowerCase();
	const items = needle
		? allItems.filter((hk) => {
				const hostLabel = hostLabels.get(hk.spec.hostId) ?? "";
				const tierLabel = policyLabels.get(hk.spec.policyId) ?? "";
				return (
					displayLabel(hk.metadata).toLowerCase().includes(needle) ||
					hk.metadata.name.toLowerCase().includes(needle) ||
					hostLabel.toLowerCase().includes(needle) ||
					tierLabel.toLowerCase().includes(needle) ||
					(hk.spec.valueFrom.env?.toLowerCase().includes(needle) ?? false)
				);
			})
		: allItems;

	async function handleDelete(hk: HostKey) {
		const refs = hk.policies ?? [];
		if (refs.length > 0) {
			const preview = refs
				.slice(0, 3)
				.map((r) => r.name)
				.join(", ");
			const overflow = refs.length > 3 ? ` (+${refs.length - 3} more)` : "";
			toast(
				"error",
				`Detach from ${refs.length} ${
					refs.length === 1 ? "policy" : "policies"
				} first: ${preview}${overflow}.`,
			);
			return;
		}
		const ok = await confirm({
			title: `Delete host key ${displayLabel(hk.metadata)}?`,
			description: "This host key is not attached to any user policy.",
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
				err instanceof ApiError
					? err.body.message
					: "Failed to delete host key.",
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
								<Th>Host</Th>
								<Th>Host policy</Th>
								<Th>Source</Th>
								<Th align="right">Used by</Th>
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
								const refCount = hk.policies?.length ?? 0;
								const enabled = hk.spec.enabled ?? true;
								const hostLabel =
									hostLabels.get(hk.spec.hostId) ??
									`Unknown (${hk.spec.hostId.slice(0, 6)}…)`;
								const tierLabel = hk.spec.policyId
									? (policyLabels.get(hk.spec.policyId) ??
										`Unknown (${hk.spec.policyId.slice(0, 6)}…)`)
									: null;
								return (
									<tr
										key={hk.metadata.name}
										className={[
											"border-t border-border transition-colors",
											enabled
												? "hover:bg-muted/40"
												: "bg-muted/30 text-muted-foreground/80",
										].join(" ")}
									>
										<td className="px-3 py-2">
											<Link
												to="/host-keys/$name"
												params={{ name: hk.metadata.name }}
												className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
											>
												<div className="flex items-center gap-2 text-sm font-medium text-foreground">
													<span>{displayLabel(hk.metadata)}</span>
													<HostKeyDiagDot id={hk.metadata.id} />
												</div>
												{hasDisplayName(hk.metadata) && (
													<div className="font-mono text-[11px] text-muted-foreground">
														{hk.metadata.name}
													</div>
												)}
											</Link>
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{hostLabel}
										</td>
										<td className="px-3 py-2">
											{tierLabel ? (
												<span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
													{tierLabel}
												</span>
											) : (
												<span className="text-[11px] text-muted-foreground/70">
													—
												</span>
											)}
										</td>
										<td className="px-3 py-2 text-xs">
											{isStored ? (
												<span className="text-foreground">Stored</span>
											) : (
												<span className="flex items-center gap-1">
													<span className="text-foreground">Env</span>
													{hk.spec.valueFrom.env && (
														<span className="font-mono text-muted-foreground">
															${hk.spec.valueFrom.env}
														</span>
													)}
												</span>
											)}
										</td>
										<td className="px-3 py-2 text-right text-xs tabular-nums">
											{refCount === 0 ? (
												<span className="text-muted-foreground/70">
													Unattached
												</span>
											) : (
												<span className="text-foreground">
													{refCount} {refCount === 1 ? "policy" : "policies"}
												</span>
											)}
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/host-keys/$name/edit"
																params={{ name: hk.metadata.name }}
															/>
														),
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
