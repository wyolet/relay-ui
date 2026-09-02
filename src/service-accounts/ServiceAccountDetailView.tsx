import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, ChevronLeft, Link2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { usePolicies } from "@/api/hooks/policies";
import { useProjects } from "@/api/hooks/projects";
import {
	useDeleteServiceAccount,
	useServiceAccount,
	useServiceAccountReferences,
} from "@/api/hooks/serviceAccounts";
import { ApiError } from "@/api/types/errors";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { useToggleServiceAccountEnabled } from "@/service-accounts/useToggleServiceAccountEnabled";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { StatusBadge } from "@/shared/StatusBadge";
import { toast } from "@/shared/Toast";

export function ServiceAccountDetailView({ name }: { name: string }) {
	const { data: sa } = useServiceAccount(name);
	const { data: projectsData } = useProjects();
	const { data: policiesData } = usePolicies();
	const { data: refs } = useServiceAccountReferences(sa.metadata.id);
	const deleteServiceAccount = useDeleteServiceAccount();
	const { setEnabled, isPending: isToggling } =
		useToggleServiceAccountEnabled();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);

	const enabled = sa.spec.enabled !== false;
	const project = (projectsData.items ?? []).find(
		(p) => p.metadata.id === sa.spec.projectId,
	);
	const policy = (policiesData.items ?? []).find(
		(p) => p.metadata.id === sa.spec.policyId,
	);
	const description = sa.metadata.description?.trim();

	async function handleDelete() {
		try {
			await deleteServiceAccount.mutateAsync(sa.metadata.id ?? "");
			toast(
				"success",
				`Service account "${displayLabel(sa.metadata)}" deleted.`,
			);
			void navigate({ to: "/service-accounts" });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete service account.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/service-accounts"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Service accounts
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<Bot className="w-4 h-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(sa.metadata)}
							{!hasDisplayName(sa.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							<StatusBadge enabled={enabled} />
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{sa.metadata.name}
						</p>
						{description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</div>
				</div>
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => void setEnabled(sa, !enabled)}
					toggling={isToggling}
					onDelete={() => setConfirming(true)}
					editLink={({ className, content }) => (
						<Link
							to="/service-accounts/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</header>

			<Card title="Configuration" icon={ShieldCheck}>
				<dl className="divide-y divide-border">
					<Row label="Project">
						{project ? (
							<span className="text-foreground">
								{displayLabel(project.metadata)}
							</span>
						) : (
							<code className="font-mono text-[11px]">{sa.spec.projectId}</code>
						)}
					</Row>
					<Row label="Policy">
						{policy ? (
							<span className="text-foreground">
								{displayLabel(policy.metadata)}
							</span>
						) : (
							<span className="text-muted-foreground">
								None — keys fall back to their own policy or a policy binding
							</span>
						)}
					</Row>
				</dl>
			</Card>

			<Card title="References" icon={Link2}>
				{(refs.items ?? []).length === 0 ? (
					<p className="text-xs text-muted-foreground">
						Nothing points at this service account yet.
					</p>
				) : (
					<ul className="divide-y divide-border">
						{(refs.items ?? []).map((r) => (
							<li
								key={`${r.kind}:${r.id}`}
								className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-xs"
							>
								<span className="text-foreground">{r.name}</span>
								<span className="text-muted-foreground">
									{r.kind} · <code className="font-mono">{r.via}</code>
								</span>
							</li>
						))}
					</ul>
				)}
			</Card>

			{confirming && (
				<DeleteConfirm
					resourceName={sa.metadata.name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteServiceAccount.isPending}
				/>
			)}
		</div>
	);
}

function Card({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: typeof Bot;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-md border border-border bg-card">
			<header className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
				<Icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
				<h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</h2>
			</header>
			<div className="px-4 py-3">{children}</div>
		</section>
	);
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="py-3 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="text-xs text-foreground min-w-0">{children}</dd>
		</div>
	);
}
