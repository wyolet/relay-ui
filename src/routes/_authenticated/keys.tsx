import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import { Check, Copy, KeyRound, Plus, Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Modal } from "#/components/Modal";
import { toast } from "#/components/Toast";
import { type ApiKey, useKeysStore } from "#/stores/keys";

type Filter = "active" | "revoked" | "all";

const searchSchema = z.object({
	filter: z.enum(["active", "revoked", "all"]).default("active"),
	q: z.string().default(""),
});

export const Route = createFileRoute("/_authenticated/keys")({
	validateSearch: searchSchema,
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

interface FilterChipProps {
	value: Filter;
	current: Filter;
	count: number;
	onClick: (next: Filter) => void;
	children: string;
}

function FilterChip({ value, current, count, onClick, children }: FilterChipProps) {
	const active = value === current;
	return (
		<button
			type="button"
			onClick={() => onClick(value)}
			aria-pressed={active}
			className={[
				"inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
				active
					? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300"
					: "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
			].join(" ")}
		>
			{children}
			<span
				className={[
					"tabular-nums text-[10px]",
					active ? "text-brand-600 dark:text-brand-400" : "text-neutral-400 dark:text-neutral-500",
				].join(" ")}
			>
				{count}
			</span>
		</button>
	);
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

interface RowProps {
	k: ApiKey;
}

function Row({ k }: RowProps) {
	const revoked = k.revokedAt !== null;
	return (
		<Link
			to="/keys/$id"
			params={{ id: k.id }}
			className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5 hover:border-brand-300 dark:hover:border-brand-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
		>
			<div className="min-w-0 flex-1 flex items-center gap-2.5">
				<span
					aria-hidden="true"
					className={[
						"w-1.5 h-1.5 rounded-full shrink-0",
						revoked ? "bg-neutral-300 dark:bg-neutral-700" : "bg-brand-500",
					].join(" ")}
				/>
				<span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
					{k.name}
				</span>
				<code className="hidden sm:inline-block text-[11px] font-mono text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800/60 truncate">
					{k.prefix}…
				</code>
				{revoked && (
					<span className="text-[10px] uppercase tracking-wide font-semibold text-neutral-400 dark:text-neutral-500 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
						revoked
					</span>
				)}
			</div>
			<div className="hidden md:flex items-center gap-5 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0">
				<span>
					<span className="text-neutral-400 dark:text-neutral-600">used </span>
					{timeAgo(k.lastUsedAt)}
				</span>
				<span>
					<span className="text-neutral-400 dark:text-neutral-600">created </span>
					{timeAgo(k.createdAt)}
				</span>
			</div>
		</Link>
	);
}

function KeysPage() {
	const navigate = useNavigate({ from: "/keys" });
	const search = Route.useSearch();
	const items = useKeysStore((s) => s.items);
	const [createOpen, setCreateOpen] = useState(false);

	const counts = {
		active: items.filter((k) => k.revokedAt === null).length,
		revoked: items.filter((k) => k.revokedAt !== null).length,
		all: items.length,
	};
	const visible = applyFilter(items, search.filter, search.q);

	function setFilter(filter: Filter) {
		void navigate({ search: (prev) => ({ ...prev, filter }) });
	}
	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }) });
	}

	return (
		<div>
			<div className="flex items-baseline justify-between mb-4 gap-4">
				<div className="min-w-0">
					<h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
						Keys
					</h1>
					<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
						Relay API keys for apps that call this deployment.
					</p>
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

			<div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
				<div className="flex items-center gap-1">
					<FilterChip
						value="active"
						current={search.filter}
						count={counts.active}
						onClick={setFilter}
					>
						Active
					</FilterChip>
					<FilterChip
						value="revoked"
						current={search.filter}
						count={counts.revoked}
						onClick={setFilter}
					>
						Revoked
					</FilterChip>
					<FilterChip
						value="all"
						current={search.filter}
						count={counts.all}
						onClick={setFilter}
					>
						All
					</FilterChip>
				</div>
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
					<input
						type="search"
						value={search.q}
						onChange={(e) => setQ(e.currentTarget.value)}
						placeholder="Search keys"
						className="h-8 pl-8 pr-3 rounded-md text-xs text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow w-48"
					/>
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
				<ul className="space-y-1">
					{visible.map((k) => (
						<li key={k.id}>
							<Row k={k} />
						</li>
					))}
				</ul>
			)}

			<CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
		</div>
	);
}
