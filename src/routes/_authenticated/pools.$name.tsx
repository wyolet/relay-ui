import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	attachmentsQueryOptions,
	useAttachments,
	useCreateAttachment,
	useDeleteAttachment,
} from "#/api/hooks/attachments";
import {
	poolDetailQueryOptions,
	useDeletePool,
	usePool,
	useUpdatePool,
} from "#/api/hooks/pools";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "#/api/hooks/ratelimits";
import { secretsListQueryOptions, useSecrets } from "#/api/hooks/secrets";
import type { AttachmentMeter } from "#/api/types/attachment";
import { ApiError } from "#/api/types/errors";
import { DeleteConfirm } from "#/components/DeleteConfirm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/pools/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(poolDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(secretsListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(
				attachmentsQueryOptions({
					parent_kind: "pool",
					parent_name: params.name,
				}),
			),
		]),
	component: PoolDetailPage,
});

type Tab = "spec" | "secrets" | "ratelimits";

function PoolDetailInner() {
	const { name } = Route.useParams();
	const { data: pool } = usePool(name);
	const { data: secretsData } = useSecrets();
	const { data: rateLimitsData } = useRateLimits();
	const { data: attachmentsData } = useAttachments({
		parent_kind: "pool",
		parent_name: name,
	});

	const deletePool = useDeletePool();
	const updatePool = useUpdatePool(name);
	const createAttachment = useCreateAttachment();
	const deleteAttachment = useDeleteAttachment({
		parent_kind: "pool",
		parent_name: name,
	});
	const navigate = useNavigate();

	const [activeTab, setActiveTab] = useState<Tab>("spec");
	const [confirming, setConfirming] = useState(false);
	const [secretSearch, setSecretSearch] = useState("");

	// Add attachment dialog state
	const [showAddAttachment, setShowAddAttachment] = useState(false);
	const [attachRateLimit, setAttachRateLimit] = useState("");
	const [attachMeter, setAttachMeter] = useState<AttachmentMeter>("requests");

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
		const newSecrets = pool.secrets.filter((s) => s !== secret);
		try {
			await updatePool.mutateAsync({
				provider: pool.provider,
				secrets: newSecrets,
				default: pool.default,
			});
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
		if (pool.secrets.includes(secret)) return;
		const newSecrets = [...pool.secrets, secret];
		try {
			await updatePool.mutateAsync({
				provider: pool.provider,
				secrets: newSecrets,
				default: pool.default,
			});
			toast("success", `Secret "${secret}" added to pool.`);
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to update pool secrets.");
			}
		}
	}

	async function handleAddAttachment() {
		if (!attachRateLimit) return;
		try {
			await createAttachment.mutateAsync({
				parent_kind: "pool",
				parent_name: name,
				ratelimit_name: attachRateLimit,
				meter: attachMeter,
			});
			toast("success", "Rate limit attached.");
			setShowAddAttachment(false);
			setAttachRateLimit("");
			setAttachMeter("requests");
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to attach rate limit.");
			}
		}
	}

	async function handleRemoveAttachment(id: string) {
		try {
			await deleteAttachment.mutateAsync(id);
			toast("success", "Rate limit detached.");
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to remove attachment.");
			}
		}
	}

	const allSecrets = secretsData.items;
	const attachedSecrets = new Set(pool.secrets);
	const availableSecrets = allSecrets.filter(
		(s) =>
			!attachedSecrets.has(s.name) &&
			s.name.toLowerCase().includes(secretSearch.toLowerCase()),
	);
	const displayedAttachedSecrets = pool.secrets.filter((s) =>
		s.toLowerCase().includes(secretSearch.toLowerCase()),
	);

	const tabs: { id: Tab; label: string }[] = [
		{ id: "spec", label: "Spec" },
		{ id: "secrets", label: `Secrets (${pool.secrets.length})` },
		{
			id: "ratelimits",
			label: `Rate Limits (${attachmentsData.items.length})`,
		},
	];

	return (
		<div>
			{/* Back + Header */}
			<div className="mb-6 flex items-center gap-3">
				<Link to="/pools" className="text-sm text-blue-600 hover:underline">
					← Pools
				</Link>
			</div>

			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 font-mono">
						{pool.name}
					</h1>
					{/* TODO: replace with real health from /admin/keypool/:pool/health when endpoint is available */}
					<span className="mt-1 inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
						Health: ok
					</span>
				</div>
				<div className="flex gap-2">
					<Link
						to="/pools/$name/edit"
						params={{ name }}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
			<div className="border-b border-gray-200 mb-6">
				<nav className="flex gap-4" aria-label="Pool detail tabs">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={[
								"pb-3 text-sm font-medium border-b-2 transition-colors",
								activeTab === tab.id
									? "border-blue-600 text-blue-600"
									: "border-transparent text-gray-500 hover:text-gray-700",
							].join(" ")}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Spec tab */}
			{activeTab === "spec" && (
				<dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
					{[
						{ label: "Name", value: pool.name },
						{ label: "Provider", value: pool.provider },
						{ label: "Default Pool", value: pool.default ? "Yes" : "No" },
					].map((f) => (
						<div
							key={f.label}
							className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4"
						>
							<dt className="text-sm font-medium text-gray-500">{f.label}</dt>
							<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
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
							className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
						/>
					</div>

					{/* Attached secrets as removable chips */}
					{pool.secrets.length > 0 && (
						<div className="mb-6">
							<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
								Attached
							</p>
							<div className="flex flex-wrap gap-2">
								{displayedAttachedSecrets.map((secret) => (
									<span
										key={secret}
										className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
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
											className="ml-0.5 text-blue-600 hover:text-red-600 transition-colors disabled:opacity-50"
										>
											×
										</button>
									</span>
								))}
							</div>
						</div>
					)}

					{/* Available secrets as checkboxes */}
					{availableSecrets.length > 0 && (
						<div>
							<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
								Available
							</p>
							<div className="flex flex-wrap gap-2">
								{availableSecrets.map((s) => (
									<button
										key={s.name}
										type="button"
										disabled={updatePool.isPending}
										onClick={() => void handleAddSecret(s.name)}
										className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
									>
										+ {s.name}
									</button>
								))}
							</div>
						</div>
					)}

					{pool.secrets.length === 0 && availableSecrets.length === 0 && (
						<p className="text-sm text-gray-500">
							{secretSearch
								? `No secrets matching "${secretSearch}".`
								: "No secrets configured."}
						</p>
					)}
				</div>
			)}

			{/* Rate Limits tab */}
			{activeTab === "ratelimits" && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-gray-600">
							Rate limit attachments for this pool.
						</p>
						<button
							type="button"
							onClick={() => setShowAddAttachment(true)}
							className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
						>
							+ Add attachment
						</button>
					</div>

					{attachmentsData.items.length === 0 ? (
						<p className="text-sm text-gray-500">No rate limits attached.</p>
					) : (
						<div className="overflow-x-auto rounded-lg border border-gray-200">
							<table className="w-full text-sm">
								<thead className="bg-gray-50 border-b border-gray-200">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
											Rate Limit
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
											Meter
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
											Status
										</th>
										<th className="px-4 py-3" />
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{attachmentsData.items.map((att) => (
										<tr key={att.id}>
											<td className="px-4 py-3 text-gray-900">
												<Link
													to="/ratelimits/$name"
													params={{ name: att.ratelimit_name }}
													className="text-blue-600 hover:underline"
												>
													{att.ratelimit_name}
												</Link>
											</td>
											<td className="px-4 py-3 text-gray-700">{att.meter}</td>
											<td className="px-4 py-3">
												{/* TODO: render quota utilization gauge when backend exposes usage data */}
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
													Active
												</span>
											</td>
											<td className="px-4 py-3 text-right">
												<button
													type="button"
													disabled={deleteAttachment.isPending}
													onClick={() => void handleRemoveAttachment(att.id)}
													className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
												>
													Remove
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* Add attachment dialog */}
					{showAddAttachment && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
							<div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
								<h2 className="text-lg font-semibold text-gray-900 mb-4">
									Add Rate Limit Attachment
								</h2>
								<div className="space-y-4">
									<div>
										<label
											htmlFor="attach-ratelimit"
											className="block text-sm font-medium text-gray-700 mb-1"
										>
											Rate Limit
										</label>
										<select
											id="attach-ratelimit"
											value={attachRateLimit}
											onChange={(e) => setAttachRateLimit(e.target.value)}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
										>
											<option value="">— select —</option>
											{rateLimitsData.items.map((rl) => (
												<option key={rl.name} value={rl.name}>
													{rl.name}
												</option>
											))}
										</select>
									</div>
									<div>
										<label
											htmlFor="attach-meter"
											className="block text-sm font-medium text-gray-700 mb-1"
										>
											Meter
										</label>
										<select
											id="attach-meter"
											value={attachMeter}
											onChange={(e) =>
												setAttachMeter(e.target.value as AttachmentMeter)
											}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
										>
											<option value="requests">Requests</option>
											<option value="tokens">Tokens</option>
											<option value="concurrency">Concurrency</option>
										</select>
									</div>
								</div>
								<div className="flex gap-3 mt-6">
									<button
										type="button"
										disabled={!attachRateLimit || createAttachment.isPending}
										onClick={() => void handleAddAttachment()}
										className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
									>
										{createAttachment.isPending ? "Attaching…" : "Attach"}
									</button>
									<button
										type="button"
										onClick={() => setShowAddAttachment(false)}
										className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{confirming && (
				<DeleteConfirm
					resourceName={pool.name}
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
		<Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
			<PoolDetailInner />
		</Suspense>
	);
}
