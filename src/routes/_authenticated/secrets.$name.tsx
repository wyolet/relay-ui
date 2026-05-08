import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { poolsListQueryOptions, usePools } from "#/api/hooks/pools";
import {
	secretDetailQueryOptions,
	secretsListQueryOptions,
	useDeleteSecret,
	useSecret,
} from "#/api/hooks/secrets";
import { ApiError } from "#/api/types/errors";
import { DeleteConfirm } from "#/components/DeleteConfirm";
import { SecretRotateDialog } from "#/components/SecretRotateDialog";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/secrets/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				secretDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(secretsListQueryOptions),
			context.queryClient.ensureQueryData(poolsListQueryOptions),
		]),
	component: SecretDetailPage,
});

function SecretDetailInner() {
	const { name } = Route.useParams();
	const { data: secret } = useSecret(name);
	const { data: poolsData } = usePools();
	const deleteSecret = useDeleteSecret();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);
	const [rotating, setRotating] = useState(false);

	const referencingPools = (poolsData.items ?? []).filter((pool) =>
		(pool.spec.secrets ?? []).includes(name),
	);

	async function handleDelete() {
		try {
			await deleteSecret.mutateAsync(name);
			toast("success", `Secret "${name}" deleted.`);
			void navigate({ to: "/secrets" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete secret.");
			}
		}
	}

	const isStored = secret.valueFrom.kind === "stored";

	return (
		<div>
			{/* Back nav */}
			<div className="mb-6">
				<Link to="/secrets" className="text-sm text-brand-600 hover:underline">
					← Secrets
				</Link>
			</div>

			{/* Header */}
			<div className="flex items-start justify-between mb-6">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
						{secret.name}
					</h1>
					<span
						className={[
							"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
							isStored
								? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
								: "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300",
						].join(" ")}
					>
						{secret.valueFrom.kind}
					</span>
				</div>
				<div className="flex gap-2">
					<Link
						to="/secrets/$name/edit"
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

			{/* Detail fields */}
			<dl className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 mb-8">
				<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
					<dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
						Name
					</dt>
					<dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100 font-mono sm:col-span-2 sm:mt-0">
						{secret.name}
					</dd>
				</div>
				<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
					<dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
						Kind
					</dt>
					<dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100 sm:col-span-2 sm:mt-0">
						{secret.valueFrom.kind}
					</dd>
				</div>

				{!isStored && (
					<>
						<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
							<dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
								Environment variable
							</dt>
							<dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100 font-mono sm:col-span-2 sm:mt-0">
								{secret.valueFrom.env ?? (
									<span className="text-neutral-400 dark:text-neutral-500">—</span>
								)}
							</dd>
						</div>
						<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
							<dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400" />
							<dd className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 sm:col-span-2 sm:mt-0">
								Set this env var on your relay deployment.
							</dd>
						</div>
					</>
				)}

				{isStored && (
					<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
						<dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
							Masked value
						</dt>
						<dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100 font-mono sm:col-span-2 sm:mt-0 flex items-center gap-3">
							<span>
								{secret.valueFrom.value_masked ?? (
									<span className="text-neutral-400 dark:text-neutral-500">—</span>
								)}
							</span>
							<button
								type="button"
								onClick={() => setRotating(true)}
								className="px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors"
							>
								Rotate value
							</button>
						</dd>
					</div>
				)}
			</dl>

			{/* References */}
			<section>
				<h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
					Referenced by pools
				</h2>
				{referencingPools.length === 0 ? (
					<p className="text-sm text-neutral-500 dark:text-neutral-400">
						No pools reference this secret.
					</p>
				) : (
					<ul className="space-y-1">
						{referencingPools.map((pool) => (
							<li key={pool.metadata.name}>
								<Link
									to="/pools/$name"
									params={{ name: pool.metadata.name }}
									className="text-sm text-brand-600 hover:underline font-mono"
								>
									{pool.metadata.name}
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			{/* Rotate dialog */}
			{rotating && (
				<SecretRotateDialog name={name} onClose={() => setRotating(false)} />
			)}

			{/* Delete confirm */}
			{confirming && (
				<DeleteConfirm
					resourceName={name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteSecret.isPending}
				/>
			)}
		</div>
	);
}

function SecretDetailPage() {
	return (
		<Suspense
			fallback={
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<SecretDetailInner />
		</Suspense>
	);
}
