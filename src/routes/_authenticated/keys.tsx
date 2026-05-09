import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import {
	Check,
	Copy,
	KeyRound,
	ListFilter,
	MoreHorizontal,
	Plus,
	Search,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useModels, modelsListQueryOptions } from "#/api/hooks/models";
import { usePools, poolsListQueryOptions } from "#/api/hooks/pools";
import {
	useProviders,
	providersListQueryOptions,
} from "#/api/hooks/providers";
import {
	useDeleteSecret,
	useSecrets,
	secretsListQueryOptions,
} from "#/api/hooks/secrets";
import { ByokModal } from "#/components/ByokModal";
import { Modal } from "#/components/Modal";
import { toast } from "#/components/Toast";
import type { Pool } from "#/api/types/pool";
import type { Provider } from "#/api/types/provider";
import type { SecretResponse } from "#/api/types/secret";
import { type ApiKey, useKeysStore } from "#/stores/keys";

type Filter = "active" | "revoked" | "all";
type Tab = "relay" | "provider" | "pools";

const searchSchema = z.object({
	tab: z.enum(["relay", "provider", "pools"]).default("relay"),
	filter: z.enum(["active", "revoked", "all"]).default("active"),
	q: z.string().default(""),
	provider: z.string().optional(),
	add: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/keys")({
	validateSearch: searchSchema,
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(providersListQueryOptions);
		void context.queryClient.prefetchQuery(modelsListQueryOptions);
		void context.queryClient.prefetchQuery(poolsListQueryOptions);
		void context.queryClient.prefetchQuery(secretsListQueryOptions);
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

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1_500);
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}
	return (
		<button
			type="button"
			onClick={() => void handleCopy()}
			aria-label="Copy"
			className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
		>
			{copied ? (
				<Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />
			) : (
				<Copy className="w-4 h-4" />
			)}
		</button>
	);
}

const createSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(64, "Name is too long"),
});
type CreateValues = z.infer<typeof createSchema>;

interface CreateModalProps {
	open: boolean;
	onClose: () => void;
}

function CreateModal({ open, onClose }: CreateModalProps) {
	const createKey = useKeysStore((s) => s.createKey);
	const clearSecret = useKeysStore((s) => s.clearSecret);
	const freshSecrets = useKeysStore((s) => s.freshSecrets);
	const [createdId, setCreatedId] = useState<string | null>(null);
	const secret = createdId !== null ? freshSecrets[createdId] : undefined;

	const form = useForm({
		defaultValues: { name: "" } as CreateValues,
		validators: {
			onSubmit: ({ value }) => {
				const r = createSchema.safeParse(value);
				if (r.success) return undefined;
				const fields: Record<string, string> = {};
				for (const issue of r.error.issues) {
					const p = issue.path[0];
					if (typeof p === "string" && !fields[p]) fields[p] = issue.message;
				}
				return { fields };
			},
		},
		onSubmit: ({ value }) => {
			const { id } = createKey(value.name);
			setCreatedId(id);
		},
	});

	function handleClose() {
		if (createdId !== null) {
			clearSecret(createdId);
			setCreatedId(null);
		}
		form.reset();
		onClose();
	}

	if (createdId !== null && secret !== undefined) {
		return (
			<Modal open={open} onClose={handleClose} title="Key created">
				<p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
					Copy this now — it won't be shown again.
				</p>
				<div className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 mb-5">
					<code className="flex-1 text-xs font-mono text-neutral-900 dark:text-neutral-100 truncate">
						{secret}
					</code>
					<CopyButton text={secret} />
				</div>
				<div className="flex justify-end">
					<button
						type="button"
						onClick={handleClose}
						className="h-9 px-4 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
					>
						I've saved it
					</button>
				</div>
			</Modal>
		);
	}

	return (
		<Modal open={open} onClose={handleClose} title="Create API key">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="name">
					{(field) => {
						const errs = field.state.meta.errors
							.filter((x): x is string => typeof x === "string")
							.slice(0, 1);
						const hasError = errs.length > 0;
						return (
							<div className="mb-5">
								<label
									htmlFor="key-name"
									className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5"
								>
									Name
								</label>
								<input
									id="key-name"
									type="text"
									required
									value={field.state.value}
									onChange={(e) => field.handleChange(e.currentTarget.value)}
									onBlur={field.handleBlur}
									placeholder="prod-app"
									aria-invalid={hasError || undefined}
									className={[
										"w-full rounded-md px-3 py-2 text-sm transition-shadow",
										"text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900",
										"placeholder-neutral-400 dark:placeholder-neutral-500",
										"border focus:outline-none focus:ring-2 focus:border-transparent",
										hasError
											? "border-red-400 dark:border-red-700 focus:ring-red-500"
											: "border-neutral-300 dark:border-neutral-700 focus:ring-brand-500",
									].join(" ")}
								/>
								{hasError && (
									<p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
										{errs[0]}
									</p>
								)}
							</div>
						);
					}}
				</form.Field>
				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={handleClose}
						className="h-9 px-4 rounded-md text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
					>
						Cancel
					</button>
					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<button
								type="submit"
								disabled={isSubmitting}
								className="h-9 px-4 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
							>
								Generate
							</button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</Modal>
	);
}

interface MenuAction {
	label: string;
	onClick: () => void;
	danger?: boolean;
	disabled?: boolean;
}

function RowMenu({ actions }: { actions: MenuAction[] }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative inline-block">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				onBlur={() => setTimeout(() => setOpen(false), 150)}
				aria-label="Row actions"
				aria-haspopup="menu"
				aria-expanded={open}
				className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
			>
				<MoreHorizontal className="w-3.5 h-3.5" />
			</button>
			{open && (
				<div
					role="menu"
					className="absolute right-0 top-8 z-10 min-w-[180px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg py-1"
				>
					{actions.map((a) => (
						<button
							key={a.label}
							type="button"
							role="menuitem"
							disabled={a.disabled}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => {
								setOpen(false);
								a.onClick();
							}}
							className={[
								"w-full text-left px-3 py-1.5 text-xs transition-colors",
								"disabled:opacity-50 disabled:cursor-not-allowed",
								a.danger
									? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
									: "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
							].join(" ")}
						>
							{a.label}
						</button>
					))}
				</div>
			)}
		</div>
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
			className={`px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ${
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
		warn:
			"bg-amber-500 shadow-[0_0_6px_rgb(245_158_11_/_0.7)] dark:shadow-[0_0_8px_rgb(245_158_11_/_0.5)]",
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
				<h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
					Keys
				</h1>
				<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
					Relay API keys, provider credentials, and the pools that group them.
				</p>
			</div>

			<div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1 mb-4">
				<TabLink value="relay" current={search.tab} onClick={setTab}>
					Relay keys
				</TabLink>
				<TabLink value="provider" current={search.tab} onClick={setTab}>
					Provider keys
				</TabLink>
				<TabLink value="pools" current={search.tab} onClick={setTab}>
					Pools
				</TabLink>
			</div>

			{search.tab === "relay" && <RelayKeysPanel />}
			{search.tab === "provider" && <ProviderKeysPanel />}
			{search.tab === "pools" && <PoolsPanel />}
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

function RelayKeysPanel() {
	const navigate = useNavigate({ from: "/keys" });
	const search = Route.useSearch();
	const items = useKeysStore((s) => s.items);
	const revoke = useKeysStore((s) => s.revoke);
	const [createOpen, setCreateOpen] = useState(false);
	const [filterOpen, setFilterOpen] = useState(false);

	const counts = {
		active: items.filter((k) => k.revokedAt === null).length,
		revoked: items.filter((k) => k.revokedAt !== null).length,
		all: items.length,
	};
	const visible = applyFilter(items, search.filter, search.q);

	function setFilter(filter: Filter) {
		void navigate({ search: (prev) => ({ ...prev, filter }) });
		setFilterOpen(false);
	}
	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }) });
	}

	const filterLabel: Record<Filter, string> = {
		active: "Active",
		revoked: "Revoked",
		all: "All",
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-3 gap-3">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
					<input
						type="search"
						value={search.q}
						onChange={(e) => setQ(e.currentTarget.value)}
						placeholder="Search keys"
						className="w-full h-8 pl-8 pr-3 rounded-md text-xs text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
					/>
				</div>
				<div className="flex items-center gap-2">
					<div className="relative">
						<button
							type="button"
							onClick={() => setFilterOpen((v) => !v)}
							onBlur={() => setTimeout(() => setFilterOpen(false), 150)}
							aria-haspopup="listbox"
							aria-expanded={filterOpen}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
						>
							<ListFilter className="w-3.5 h-3.5" />
							<span>{filterLabel[search.filter]}</span>
						</button>
						{filterOpen && (
							<div
								role="listbox"
								className="absolute right-0 top-9 z-10 min-w-[180px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg py-1"
							>
								<div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Status
								</div>
								{(["active", "revoked", "all"] as const).map((f) => {
									const active = search.filter === f;
									return (
										<button
											key={f}
											type="button"
											role="option"
											aria-selected={active}
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => setFilter(f)}
											className={[
												"w-full flex items-center justify-between gap-2 px-2.5 h-8 text-xs transition-colors",
												active
													? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300"
													: "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
											].join(" ")}
										>
											<span className="inline-flex items-center gap-1.5">
												{active && <Check className="w-3 h-3 shrink-0" />}
												<span>{filterLabel[f]}</span>
											</span>
											<span
												className={[
													"text-[10px] tabular-nums",
													active
														? "text-brand-600 dark:text-brand-400"
														: "text-neutral-400 dark:text-neutral-500",
												].join(" ")}
											>
												{counts[f]}
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={() => setCreateOpen(true)}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
					>
						<Plus className="w-3.5 h-3.5" />
						New key
					</button>
				</div>
			</div>

			{visible.length === 0 ? (
				<div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-14 text-center">
					<KeyRound className="w-6 h-6 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
					{items.length === 0 ? (
						<>
							<p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
								No keys yet
							</p>
							<p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
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
						<p className="text-sm text-neutral-500 dark:text-neutral-400">
							No keys match this filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
					<table className="w-full border-collapse">
						<thead className="bg-neutral-50 dark:bg-neutral-900/60">
							<tr>
								<th scope="col" className="w-6 px-3 py-2" aria-label="Status" />
								<Th>Name</Th>
								<Th>Prefix</Th>
								<Th align="right">Last used</Th>
								<Th align="right">Created</Th>
								<th scope="col" className="w-10 px-3 py-2" aria-label="Actions" />
							</tr>
						</thead>
						<tbody>
							{visible.map((k) => {
								const revoked = k.revokedAt !== null;
								return (
									<tr
										key={k.id}
										className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
									>
										<td className="px-3 py-2 align-middle">
											<StatusDot
												tone={revoked ? "muted" : "active"}
												label={revoked ? "Revoked" : "Active"}
											/>
										</td>
										<td className="px-3 py-2">
											<Link
												to="/keys/$id"
												params={{ id: k.id }}
												className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
											>
												{k.name}
											</Link>
										</td>
										<td className="px-3 py-2">
											<code className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800/60">
												{k.prefix}…
											</code>
										</td>
										<td className="px-3 py-2 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
											{timeAgo(k.lastUsedAt)}
										</td>
										<td className="px-3 py-2 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
											{timeAgo(k.createdAt)}
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit name",
														onClick: () =>
															toast("success", "Edit name — coming soon."),
													},
													{
														label: revoked ? "Revoked" : "Revoke",
														disabled: revoked,
														danger: !revoked,
														onClick: () => {
															if (
																window.confirm(`Revoke "${k.name}"? Apps using this key will start returning 401.`)
															) {
																revoke(k.id);
																toast("success", `"${k.name}" revoked.`);
															}
														},
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

			<CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
		</div>
	);
}

function ProviderKeysPanel() {
	const navigate = useNavigate({ from: "/keys" });
	const search = Route.useSearch();
	const { data: providers } = useProviders();
	const { data: pools } = usePools();
	const { data: secrets } = useSecrets();
	const [byokOpen, setByokOpen] = useState(false);
	const [filterOpen, setFilterOpen] = useState(false);
	const [keyQ, setKeyQ] = useState("");

	const list = providers.items ?? [];

	function keyCount(providerName: string): number {
		const known = new Set(secrets.items?.map((s) => s.name) ?? []);
		return (pools.items ?? [])
			.filter((p) => p.spec.provider === providerName)
			.flatMap((p) => p.spec.secrets ?? [])
			.filter((n) => known.has(n)).length;
	}

	// "" = all providers
	const selected = search.provider ?? "";
	const selectedProvider =
		selected === "" ? undefined : list.find((p) => p.metadata.name === selected);
	const totalKeys = list.reduce((acc, p) => acc + keyCount(p.metadata.name), 0);

	function pick(provider: string) {
		void navigate({
			search: (prev) => ({ ...prev, provider, add: undefined }),
		});
		setFilterOpen(false);
	}

	function onByokPick(provider: string) {
		void navigate({
			search: (prev) => ({ ...prev, provider, add: "1" }),
		});
	}

	if (list.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-14 text-center">
				<KeyRound className="w-6 h-6 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
				<p className="text-sm text-neutral-500 dark:text-neutral-400">
					No providers configured yet.
				</p>
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-3 gap-3">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
					<input
						type="search"
						value={keyQ}
						onChange={(e) => setKeyQ(e.currentTarget.value)}
						placeholder="Search keys"
						className="w-full h-8 pl-8 pr-3 rounded-md text-xs text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
					/>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative">
						<button
							type="button"
							onClick={() => setFilterOpen((v) => !v)}
							onBlur={() => setTimeout(() => setFilterOpen(false), 150)}
							aria-haspopup="listbox"
							aria-expanded={filterOpen}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
						>
							<ListFilter className="w-3.5 h-3.5" />
							<span>
								{selectedProvider
									? (selectedProvider.spec.displayName ?? selectedProvider.metadata.name)
									: "All providers"}
							</span>
						</button>
						{filterOpen && (
							<div
								role="listbox"
								className="absolute right-0 top-9 z-10 min-w-[200px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg py-1"
							>
								<div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Provider
								</div>
								<button
									type="button"
									role="option"
									aria-selected={selected === ""}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => pick("")}
									className={[
										"w-full flex items-center justify-between gap-2 px-2.5 h-8 text-xs transition-colors",
										selected === ""
											? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300"
											: "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
									].join(" ")}
								>
									<span className="inline-flex items-center gap-1.5 min-w-0">
										{selected === "" && <Check className="w-3 h-3 shrink-0" />}
										<span>All providers</span>
									</span>
									<span
										className={[
											"text-[10px] tabular-nums shrink-0",
											selected === ""
												? "text-brand-600 dark:text-brand-400"
												: "text-neutral-400 dark:text-neutral-500",
										].join(" ")}
									>
										{totalKeys}
									</span>
								</button>
								<div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
								{list.map((p) => {
									const active = p.metadata.name === selected;
									const count = keyCount(p.metadata.name);
									return (
										<button
											key={p.metadata.name}
											type="button"
											role="option"
											aria-selected={active}
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => pick(p.metadata.name)}
											className={[
												"w-full flex items-center justify-between gap-2 px-2.5 h-8 text-xs transition-colors",
												active
													? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300"
													: "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
											].join(" ")}
										>
											<span className="inline-flex items-center gap-1.5 min-w-0">
												{active && <Check className="w-3 h-3 shrink-0" />}
												<span className="capitalize truncate">
													{p.spec.displayName ?? p.metadata.name}
												</span>
											</span>
											<span
												className={[
													"text-[10px] tabular-nums shrink-0",
													active
														? "text-brand-600 dark:text-brand-400"
														: "text-neutral-400 dark:text-neutral-500",
												].join(" ")}
											>
												{count}
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={() => setByokOpen(true)}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
					>
						<Plus className="w-3.5 h-3.5" />
						Bring your own key
					</button>
				</div>
			</div>

			<ProviderKeysTable
				providers={list}
				pools={pools.items ?? []}
				secrets={secrets.items ?? []}
				selectedProvider={selected}
				query={keyQ}
			/>

			<ByokModal
				open={byokOpen}
				onClose={() => setByokOpen(false)}
				onPick={onByokPick}
			/>
		</div>
	);
}

interface ProviderKeysTableProps {
	providers: Provider[];
	pools: Pool[];
	secrets: SecretResponse[];
	selectedProvider: string;
	query: string;
}

function ProviderKeysTable({
	providers,
	pools,
	secrets,
	selectedProvider,
	query,
}: ProviderKeysTableProps) {
	const deleteSecret = useDeleteSecret();
	const secretByName: Record<string, SecretResponse> = {};
	for (const s of secrets) secretByName[s.name] = s;

	async function handleDelete(name: string) {
		if (!window.confirm(`Delete key "${name}"? This cannot be undone.`)) return;
		try {
			await deleteSecret.mutateAsync(name);
			toast("success", `Key "${name}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof Error ? err.message : "Failed to delete key.",
			);
		}
	}

	function notImplemented(label: string) {
		toast("success", `${label} — coming soon.`);
	}

	// Build a row per (secret name, provider) — secrets live inside pools.
	type Entry = {
		name: string;
		provider: string;
		pools: string[];
		secret: SecretResponse | undefined;
	};
	const byKey = new Map<string, Entry>();

	const relevantPools = pools.filter(
		(p) => !selectedProvider || p.spec.provider === selectedProvider,
	);
	for (const p of relevantPools) {
		for (const name of p.spec.secrets ?? []) {
			const k = `${p.spec.provider}::${name}`;
			const existing = byKey.get(k);
			if (existing) {
				existing.pools.push(p.metadata.name);
			} else {
				byKey.set(k, {
					name,
					provider: p.spec.provider,
					pools: [p.metadata.name],
					secret: secretByName[name],
				});
			}
		}
	}

	// Surface orphan secrets (matching provider scope) too — only when filter
	// implies them. Without provider→secret linkage on read we skip orphans.
	const ql = query.trim().toLowerCase();
	const rows = [...byKey.values()].filter((r) => {
		if (!ql) return true;
		return (
			r.name.toLowerCase().includes(ql) ||
			r.provider.toLowerCase().includes(ql) ||
			r.pools.some((p) => p.toLowerCase().includes(ql))
		);
	});

	rows.sort(
		(a, b) =>
			a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name),
	);

	const providerByName: Record<string, Provider> = {};
	for (const p of providers) providerByName[p.metadata.name] = p;

	if (rows.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-14 text-center">
				<KeyRound className="w-6 h-6 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
				<p className="text-sm text-neutral-500 dark:text-neutral-400">
					{selectedProvider
						? `No keys for ${selectedProvider} yet.`
						: "No upstream keys yet — connect one with Bring your own key."}
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
			<table className="w-full border-collapse">
				<thead className="bg-neutral-50 dark:bg-neutral-900/60">
					<tr>
						<th scope="col" className="w-6 px-3 py-2" aria-label="Status" />
						<Th>Name</Th>
						<Th>Provider</Th>
						<Th>Pools</Th>
						<th scope="col" className="w-10 px-3 py-2" aria-label="Actions" />
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => {
						const tone: StatusTone = !r.secret ? "danger" : "active";
						const label = !r.secret ? "Missing" : "Active";
						const provDisplay =
							providerByName[r.provider]?.spec.displayName ?? r.provider;
						return (
							<tr
								key={`${r.provider}::${r.name}`}
								className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
							>
								<td className="px-3 py-2 align-middle">
									<StatusDot tone={tone} label={label} />
								</td>
								<td className="px-3 py-2">
									<span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
										{r.name}
									</span>
								</td>
								<td className="px-3 py-2">
									<Link
										to="/providers/$name"
										params={{ name: r.provider }}
										className="text-sm text-neutral-700 dark:text-neutral-300 hover:underline capitalize"
									>
										{provDisplay}
									</Link>
								</td>
								<td className="px-3 py-2">
									<div className="flex flex-wrap gap-1">
										{r.pools.map((pn) => (
											<Link
												key={pn}
												to="/pools/$name"
												params={{ name: pn }}
												className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
											>
												{pn}
											</Link>
										))}
									</div>
								</td>
								<td className="px-3 py-2 text-right">
									<RowMenu
										actions={[
											{
												label: "Edit name",
												onClick: () => notImplemented("Edit name"),
											},
											{
												label: "Edit pools",
												onClick: () => notImplemented("Edit pools"),
											},
											{
												label: "Edit models",
												onClick: () => notImplemented("Edit models"),
											},
											{
												label: "Delete",
												danger: true,
												onClick: () => void handleDelete(r.name),
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
	);
}

function PoolsPanel() {
	const { data: pools } = usePools();
	const { data: models } = useModels();
	const items = pools.items ?? [];

	function modelCountFor(provider: string): number {
		return (models.items ?? []).filter((m) => m.spec.provider === provider).length;
	}

	return (
		<div>
			<div className="flex items-center justify-end mb-3">
				<Link
					to="/pools/new"
					className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
				>
					<Plus className="w-3.5 h-3.5" />
					New pool
				</Link>
			</div>
			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-14 text-center">
					<KeyRound className="w-6 h-6 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
					<p className="text-sm text-neutral-500 dark:text-neutral-400">
						No pools configured yet.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
					<table className="w-full border-collapse">
						<thead className="bg-neutral-50 dark:bg-neutral-900/60">
							<tr>
								<th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Name
								</th>
								<th className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Provider
								</th>
								<th className="text-right px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Keys
								</th>
								<th className="text-right px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Models
								</th>
								<th className="text-right px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Mode
								</th>
							</tr>
						</thead>
						<tbody>
							{items.map((p) => (
								<tr
									key={p.metadata.name}
									className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
								>
									<td className="px-3 py-2">
										<Link
											to="/pools/$name"
											params={{ name: p.metadata.name }}
											className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
										>
											{p.metadata.name}
										</Link>
									</td>
									<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 capitalize">
										<Link
											to="/providers/$name"
											params={{ name: p.spec.provider }}
											className="hover:underline"
										>
											{p.spec.provider}
										</Link>
									</td>
									<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 text-right tabular-nums">
										{(p.spec.secrets ?? []).length}
									</td>
									<td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 text-right tabular-nums">
										{modelCountFor(p.spec.provider)}
									</td>
									<td className="px-3 py-2 text-right">
										{p.spec.passthrough ? (
											<span className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
												passthrough
											</span>
										) : (
											<span className="text-[11px] text-neutral-400 dark:text-neutral-500">
												—
											</span>
										)}
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
