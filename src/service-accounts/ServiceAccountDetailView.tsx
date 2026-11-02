import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, ChevronLeft, Link2, ShieldCheck } from "lucide-react";
import { CheckAccessButton } from "@/access-review/CheckAccessButton";
import { useProjects } from "@/api/hooks/projects";
import {
	useDeleteServiceAccount,
	useServiceAccount,
	useServiceAccountReferences,
} from "@/api/hooks/serviceAccounts";
import { displayLabel } from "@/lib/displayLabel";
import { EraseBodiesButton } from "@/logs/EraseBodiesButton";
import { PrincipalPolicy } from "@/policy-bindings/PrincipalPolicy";
import { useToggleServiceAccountEnabled } from "@/service-accounts/useToggleServiceAccountEnabled";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function ServiceAccountDetailView({ name }: { name: string }) {
	const { data: sa } = useServiceAccount(name);
	const { data: projectsData } = useProjects();
	const { data: refs } = useServiceAccountReferences(sa.metadata.id);
	const { setEnabled, isPending: isToggling } =
		useToggleServiceAccountEnabled();
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeleteServiceAccount(), {
		noun: "service account",
		onDeleted: () => void navigate({ to: "/service-accounts" }),
	});

	const enabled = sa.spec.enabled !== false;
	const project = (projectsData.items ?? []).find(
		(p) => p.metadata.id === sa.spec.projectId,
	);

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/service-accounts"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Service accounts
			</Link>

			<DetailPageHeader
				icon={Bot}
				metadata={sa.metadata}
				badges={<StatusBadge enabled={enabled} />}
			>
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => void setEnabled(sa, !enabled)}
					toggling={isToggling}
					onDelete={() =>
						del.request({
							id: sa.metadata.id ?? "",
							name: sa.metadata.name,
							label: displayLabel(sa.metadata),
						})
					}
					editLink={({ className, content }) => (
						<Link
							to="/service-accounts/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				>
					<CheckAccessButton
						subject={{ kind: "serviceaccount", name: sa.metadata.name }}
						subjectLabel={displayLabel(sa.metadata)}
						size="lg"
					/>
					<EraseBodiesButton
						scope={{
							principal: {
								id: sa.metadata.id ?? "",
								name: sa.metadata.name,
								label: displayLabel(sa.metadata),
								kind: "service account",
							},
						}}
					/>
				</DetailHeaderActions>
			</DetailPageHeader>

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
						<PrincipalPolicy
							principal={{ kind: "serviceaccount", id: sa.metadata.id ?? "" }}
						/>
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

			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
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
