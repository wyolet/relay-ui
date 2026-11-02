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
import { AccountPolicy } from "@/policy-bindings/AccountPolicy";
import { useToggleServiceAccountEnabled } from "@/service-accounts/useToggleServiceAccountEnabled";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { ReferencesList } from "@/shared/ReferencesList";
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

			<DetailCard title="Configuration" icon={ShieldCheck}>
				<dl className="divide-y divide-border">
					<DetailRow label="Project">
						{project ? (
							<span className="text-foreground">
								{displayLabel(project.metadata)}
							</span>
						) : (
							<code className="font-mono text-[11px]">{sa.spec.projectId}</code>
						)}
					</DetailRow>
					<AccountPolicy
						accountRef={{
							ownerOf: { kind: "serviceaccount", id: sa.metadata.id ?? "" },
						}}
					/>
				</dl>
			</DetailCard>

			<DetailCard title="References" icon={Link2}>
				<ReferencesList
					items={refs.items}
					empty="Nothing points at this service account yet."
				/>
			</DetailCard>

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
