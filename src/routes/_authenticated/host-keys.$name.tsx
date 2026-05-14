import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

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
	const isStored = hk.spec.valueFrom.kind === "stored";
	const description = hk.metadata.description?.trim();

	async function handleDelete() {
		try {
			await deleteHostKey.mutateAsync(hkId);
			toast("success", `Host key "${displayLabel(hk.metadata)}" deleted.`);
			void navigate({
				to: "/keys",
				search: { tab: "provider", filter: "active", q: "" },
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete host key.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Link
					to="/keys"
					search={{ tab: "provider", filter: "active", q: "" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Host keys
				</Link>
			</div>

			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-semibold text-foreground truncate">
							{displayLabel(hk.metadata)}
						</h1>
						<KindBadge kind={isStored ? "stored" : "env"} />
					</div>
					{hasDisplayName(hk.metadata) && (
						<p className="mt-1 font-mono text-[11px] text-muted-foreground">
							{hk.metadata.name}
						</p>
					)}
					{description && (
						<p className="mt-2 max-w-2xl text-xs text-muted-foreground leading-relaxed">
							{description}
						</p>
					)}
				</div>
				<div className="flex gap-2 shrink-0">
					<Link to="/host-keys/$name/edit" params={{ name }}>
						<Button type="button" variant="outline">
							Edit
						</Button>
					</Link>
					<Button
						type="button"
						variant="destructive"
						onClick={() => setConfirming(true)}
					>
						Delete
					</Button>
				</div>
			</div>

			<dl className="divide-y divide-border rounded-md border border-border bg-card">
				<DetailRow label="Slug">
					<span className="font-mono text-foreground">{hk.metadata.name}</span>
				</DetailRow>
				<DetailRow label="Source">
					{isStored ? "Stored value" : "Environment variable"}
				</DetailRow>
				{!isStored && (
					<DetailRow label="Environment variable">
						{hk.spec.valueFrom.env ? (
							<span className="font-mono text-foreground">
								{hk.spec.valueFrom.env}
							</span>
						) : (
							<span className="text-muted-foreground">—</span>
						)}
						<p className="mt-1 text-[11px] text-muted-foreground">
							Set this env var on your relay deployment.
						</p>
					</DetailRow>
				)}
				{isStored && (
					<DetailRow label="Value">
						<div className="flex items-center gap-3">
							<span className="font-mono text-muted-foreground">••••••••</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setRotating(true)}
							>
								Rotate value
							</Button>
						</div>
					</DetailRow>
				)}
			</dl>

			<section>
				<h2 className="text-sm font-semibold text-foreground mb-2">
					Referenced by policies
				</h2>
				{referencingPolicies.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						No policies reference this host key.
					</p>
				) : (
					<ul className="flex flex-col gap-1">
						{referencingPolicies.map((policy) => (
							<li key={policy.metadata.name}>
								<Link
									to="/policies/$name"
									params={{ name: policy.metadata.name }}
									className="text-xs text-primary hover:underline"
								>
									{displayLabel(policy.metadata)}
									{!hasDisplayName(policy.metadata) && (
										<span className="font-mono"> </span>
									)}
								</Link>
								{hasDisplayName(policy.metadata) && (
									<span className="ml-2 font-mono text-[11px] text-muted-foreground">
										{policy.metadata.name}
									</span>
								)}
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
					resourceName={hk.metadata.name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteHostKey.isPending}
				/>
			)}
		</div>
	);
}

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="text-xs text-foreground">{children}</dd>
		</div>
	);
}

function KindBadge({ kind }: { kind: "stored" | "env" }) {
	return (
		<span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
			{kind === "stored" ? "stored" : "env"}
		</span>
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
