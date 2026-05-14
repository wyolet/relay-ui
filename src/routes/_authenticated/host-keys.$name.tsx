import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	hostKeyDetailQueryOptions,
	hostKeysListQueryOptions,
	useDeleteHostKey,
	useHostKey,
} from "@/api/hooks/hostkeys";
import { policiesListQueryOptions, usePolicies } from "@/api/hooks/policies";
import { ApiError } from "@/api/types/errors";
import { DeleteConfirm } from "@/components/DeleteConfirm";
import { SecretRotateDialog } from "@/components/SecretRotateDialog";
import { toast } from "@/components/Toast";

export const Route = createFileRoute("/_authenticated/host-keys/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				hostKeyDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: HostKeyDetailPage,
});

function HostKeyDetailInner() {
	const { name } = Route.useParams();
	const { data: hk } = useHostKey(name);
	const { data: policiesData } = usePolicies();
	const deleteHostKey = useDeleteHostKey();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);
	const [rotating, setRotating] = useState(false);

	const hkId = hk.metadata.id ?? "";
	const referencingPolicies = (policiesData.items ?? []).filter((policy) =>
		(policy.spec.hostKeyIds ?? []).includes(hkId),
	);

	async function handleDelete() {
		try {
			await deleteHostKey.mutateAsync(hkId);
			toast("success", `Host key "${name}" deleted.`);
			void navigate({ to: "/host-keys" });
		} catch (err) {
			if (err instanceof ApiError) {
				toast("error", err.body.message);
			} else {
				toast("error", "Failed to delete host key.");
			}
		}
	}

	const isStored = hk.spec.valueFrom.kind === "stored";

	return (
		<div>
			<div className="mb-6">
				<Link
					to="/host-keys"
					className="text-sm text-brand-600 hover:underline"
				>
					← Host Keys
				</Link>
			</div>

			<div className="flex items-start justify-between mb-6">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold text-foreground font-mono">
						{hk.metadata.name}
					</h1>
					<span
						className={[
							"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
							isStored
								? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
								: "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300",
						].join(" ")}
					>
						{hk.spec.valueFrom.kind}
					</span>
				</div>
				<div className="flex gap-2">
					<Link
						to="/host-keys/$name/edit"
						params={{ name }}
						className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
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

			<dl className="divide-y divide-border rounded-lg border border-border bg-card mb-8">
				<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
					<dt className="text-sm font-medium text-muted-foreground">Name</dt>
					<dd className="mt-1 text-sm text-foreground font-mono sm:col-span-2 sm:mt-0">
						{hk.metadata.name}
					</dd>
				</div>
				<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
					<dt className="text-sm font-medium text-muted-foreground">Kind</dt>
					<dd className="mt-1 text-sm text-foreground sm:col-span-2 sm:mt-0">
						{hk.spec.valueFrom.kind}
					</dd>
				</div>

				{!isStored && (
					<>
						<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
							<dt className="text-sm font-medium text-muted-foreground">
								Environment variable
							</dt>
							<dd className="mt-1 text-sm text-foreground font-mono sm:col-span-2 sm:mt-0">
								{hk.spec.valueFrom.env ?? (
									<span className="text-muted-foreground">—</span>
								)}
							</dd>
						</div>
						<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
							<dt className="text-sm font-medium text-muted-foreground" />
							<dd className="mt-1 text-xs text-muted-foreground sm:col-span-2 sm:mt-0">
								Set this env var on your relay deployment.
							</dd>
						</div>
					</>
				)}

				{isStored && (
					<div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
						<dt className="text-sm font-medium text-muted-foreground">Value</dt>
						<dd className="mt-1 text-sm text-foreground font-mono sm:col-span-2 sm:mt-0 flex items-center gap-3">
							<span className="text-muted-foreground">••••••••</span>
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

			<section>
				<h2 className="text-lg font-semibold text-foreground mb-3">
					Referenced by policies
				</h2>
				{referencingPolicies.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No policies reference this host key.
					</p>
				) : (
					<ul className="space-y-1">
						{referencingPolicies.map((policy) => (
							<li key={policy.metadata.name}>
								<Link
									to="/policies/$name"
									params={{ name: policy.metadata.name }}
									className="text-sm text-brand-600 hover:underline font-mono"
								>
									{policy.metadata.name}
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			{rotating && (
				<SecretRotateDialog hk={hk} onClose={() => setRotating(false)} />
			)}

			{confirming && (
				<DeleteConfirm
					resourceName={name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteHostKey.isPending}
				/>
			)}
		</div>
	);
}

function HostKeyDetailPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<HostKeyDetailInner />
		</Suspense>
	);
}
