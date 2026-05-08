/**
 * Pool detail page — tabs: Spec | Secrets | Rate Limits.
 *
 * Rate limits are now managed inline on the Pool spec (spec.rateLimits[]).
 * The "Rate Limits" tab is read-only here; editing happens via the Edit form.
 * The "Secrets" tab still supports inline add/remove via useUpdatePool.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	poolDetailQueryOptions,
	useDeletePool,
	usePool,
	useUpdatePool,
} from "#/api/hooks/pools";
import { secretsListQueryOptions, useSecrets } from "#/api/hooks/secrets";
import { ApiError } from "#/api/types/errors";
import type { PoolUpdate } from "#/api/types/pool";
import { DeleteConfirm } from "#/components/DeleteConfirm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/pools/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(poolDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(secretsListQueryOptions),
		]),
	component: PoolDetailPage,
});

type Tab = "spec" | "secrets" | "ratelimits";

function PoolDetailInner() {
	const { name } = Route.useParams();
	const { data: pool } = usePool(name);
	const { data: secretsData } = useSecrets();

	const deletePool = useDeletePool();
	const updatePool = useUpdatePool(name);
	const navigate = useNavigate();

	const [activeTab, setActiveTab] = useState<Tab>("spec");
	const [confirming, setConfirming] = useState(false);
	const [secretSearch, setSecretSearch] = useState("");

	const poolSecrets = pool.spec.secrets ?? [];
	const rateLimits = pool.spec.rateLimits ?? [];

	async function handleDelete() {
		try {
			await deletePool.mutateAsync(name);
			toast("success", `Pool "${name}" deleted.`);
			void navigate({ to: "/pools" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete pool.");
			}
		}
	}

	async function handleRemoveSecret(secret: string) {
		const newSecrets = poolSecrets.filter((s) => s !== secret);
		const payload: PoolUpdate = {
			metadata: pool.metadata,
			spec: {
				provider: pool.spec.provider,
				secrets: newSecrets,
				rateLimits: pool.spec.rateLimits,
			},
		};
		try {
			await updatePool.mutateAsync(payload);
			toast("success", `Secret "${secret}" removed from pool.`);
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to update pool secrets.");
			}
		}
	}

	async function handleAddSecret(secret: string) {
		if (poolSecrets.includes(secret)) return;
		const newSecrets = [...poolSecrets, secret];
		const payload: PoolUpdate = {
			metadata: pool.metadata,
			spec: {
				provider: pool.spec.provider,
				secrets: newSecrets,
				rateLimits: pool.spec.rateLimits,
			},
		};
		try {
			await updatePool.mutateAsync(payload);
			toast("success", `Secret "${secret}" added to pool.`);
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to update pool secrets.");
			}
		}
	}

	const allSecrets = secretsData.items ?? [];
	const attachedSecrets = new Set(poolSecrets);
	const availableSecrets = allSecrets.filter(
		(s) =>
			!attachedSecrets.has(s.name) &&
			s.name.toLowerCase().includes(secretSearch.toLowerCase()),
	);
	const displayedAttachedSecrets = poolSecrets.filter((s) =>
		s.toLowerCase().includes(secretSearch.toLowerCase()),
	);

	const tabs: { id: Tab; label: string }[] = [
		{ id: "spec", label: "Spec" },
		{ id: "secrets", label: `Secrets (${poolSecrets.length})` },
		{ id: "ratelimits", label: `Rate Limits (${rateLimits.length})` },
	];

	return (
		<div>
			{/* Back + Header */}
			<div className="mb-6 flex items-center gap-3">
				<Link to="/pools" className="text-sm text-brand-600 hover:underline">
					← Pools
				</Link>
			</div>

			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
						{pool.metadata.name}
					</h1>
					{/* TODO: replace with real health from /admin/keypool/:pool/health when endpoint is available */}
					<span className="mt-1 inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5">
						Health: ok
					</span>
				</div>
				<div className="flex gap-2">
					<Link
						to="/pools/$name/edit"
						params={{ name }}
						className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
					>
						Edit
					</Link>
					<button
						type="button"
						onClick={() => setConfirming(true)}
						className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
					>
						Delete
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-neutral-200 dark:border-neutral-800 mb-6">
				<nav className="flex gap-4" aria-label="Pool detail tabs">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={[
								"pb-3 text-sm font-medium border-b-2 transition-colors",
								activeTab === tab.id
									? "border-brand-600 text-brand-600 dark:text-brand-400"
									: "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300",
							].join(" ")}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Spec tab */}
			{activeTab === "spec" && (
				<dl className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
					{[
						{ label: "Name", value: pool.metadata.name },
						{ label: "Provider", value: pool.spec.provider },
					].map((f) => (
						<div
							key={f.label}
							className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4"
						>
							<dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
								{f.label}
							</dt>
							<dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100 sm:col-span-2 sm:mt-0">
								{f.value}
							</dd>
						</div>
					))}
				</dl>
			)}

			{/* Secrets tab */}
			{activeTab === "secrets" && (
				<div>
					<div className="mb-4">
						<input
							type="search"
							placeholder="Search secrets…"
							value={secretSearch}
							onChange={(e) => setSecretSearch(e.target.value)}
							className="w-full max-w-sm border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
						/>
					</div>

					{/* Attached secrets as removable chips */}
					{poolSecrets.length > 0 && (
						<div className="mb-6">
							<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
								Attached
							</p>
							<div className="flex flex-wrap gap-2">
								{displayedAttachedSecrets.map((secret) => (
									<span
										key={secret}
										className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
									>
										<Link
											to="/secrets/$name"
											params={{ name: secret }}
											className="hover:underline"
											onClick={(e) => e.stopPropagation()}
										>
											{secret}
										</Link>
										<button
											type="button"
											aria-label={`Remove ${secret}`}
											disabled={updatePool.isPending}
											onClick={() => void handleRemoveSecret(secret)}
											className="ml-0.5 text-brand-600 dark:text-brand-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
										>
											×
										</button>
									</span>
								))}
							</div>
						</div>
					)}

					{/* Available secrets */}
					{availableSecrets.length > 0 && (
						<div>
							<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
								Available
							</p>
							<div className="flex flex-wrap gap-2">
								{availableSecrets.map((s) => (
									<button
										key={s.name}
										type="button"
										disabled={updatePool.isPending}
										onClick={() => void handleAddSecret(s.name)}
										className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
									>
										+ {s.name}
									</button>
								))}
							</div>
						</div>
					)}

					{poolSecrets.length === 0 && availableSecrets.length === 0 && (
						<p className="text-sm text-neutral-500 dark:text-neutral-400">
							{secretSearch
								? `No secrets matching "${secretSearch}".`
								: "No secrets configured."}
						</p>
					)}
				</div>
			)}

			{/* Rate Limits tab — read-only; edit via Edit button */}
			{activeTab === "ratelimits" && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Rate limits defined on this pool's spec. To add or remove, use the{" "}
							<Link
								to="/pools/$name/edit"
								params={{ name }}
								className="text-brand-600 hover:underline"
							>
								Edit
							</Link>{" "}
							form.
						</p>
					</div>

					{rateLimits.length === 0 ? (
						<p className="text-sm text-neutral-500 dark:text-neutral-400">
							No rate limits configured on this pool.
						</p>
					) : (
						<div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
							<table className="w-full text-sm">
								<thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
											Rate Limit
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
									{rateLimits.map((rl) => (
										<tr key={rl.Ref} className="bg-white dark:bg-neutral-900">
											<td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
												<Link
													to="/ratelimits/$name"
													params={{ name: rl.Ref }}
													className="text-brand-600 hover:underline"
												>
													{rl.Ref}
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{confirming && (
				<DeleteConfirm
					resourceName={pool.metadata.name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deletePool.isPending}
				/>
			)}
		</div>
	);
}

function PoolDetailPage() {
	return (
		<Suspense
			fallback={
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<PoolDetailInner />
		</Suspense>
	);
}
