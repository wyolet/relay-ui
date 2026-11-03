import { Link, useNavigate } from "@tanstack/react-router";
import {
	Bot,
	Boxes,
	ChevronLeft,
	KeyRound,
	Link2,
	ShieldCheck,
	Users,
} from "lucide-react";
import { useKeysForPrincipals } from "@/api/hooks/keys";
import { useProjectPolicies } from "@/api/hooks/policies";
import { usePolicyBindingsOwnedBy } from "@/api/hooks/policyBindings";
import {
	useDeleteProject,
	useProject,
	useProjectReferences,
} from "@/api/hooks/projects";
import { useRoleBindingsAtScope } from "@/api/hooks/roleBindings";
import { useServiceAccountsInProject } from "@/api/hooks/serviceAccounts";
import { useTeams } from "@/api/hooks/teams";
import { resolveWindow, useScopeSpend } from "@/api/hooks/usage";
import { displayLabel } from "@/lib/displayLabel";
import { EraseBodiesButton } from "@/logs/EraseBodiesButton";
import { AccountChips } from "@/policy-bindings/AccountChips";
import { AccountPolicy } from "@/policy-bindings/AccountPolicy";
import { InheritedPolicies } from "@/policy-bindings/InheritedPolicies";
import { useToggleProjectEnabled } from "@/projects/useToggleProjectEnabled";
import { subjectLabel } from "@/role-bindings/SubjectsEditor";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { ReferencesList } from "@/shared/ReferencesList";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { ScopeSpendCard } from "@/teams/ScopeSpendCard";

export function ProjectDetailView({ name }: { name: string }) {
	const { data: project } = useProject(name);
	const { data: refs } = useProjectReferences(project.metadata.id);
	const { data: teamsData } = useTeams();
	const projectId = project.metadata.id ?? "";
	const serviceAccounts = useServiceAccountsInProject(projectId);
	const serviceAccountIds = (serviceAccounts.data?.items ?? [])
		.map((sa) => sa.metadata.id ?? "")
		.filter((id) => id.length > 0);
	const keys = useKeysForPrincipals(serviceAccountIds);
	const policies = useProjectPolicies(projectId);
	const policyBindings = usePolicyBindingsOwnedBy(projectId);
	const roleBindings = useRoleBindingsAtScope("project", projectId);
	const period = resolveWindow("month");
	const { spend, unavailable } = useScopeSpend(
		"project_id",
		projectId,
		"model",
		period,
	);
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeleteProject(), {
		noun: "project",
		onDeleted: () => void navigate({ to: "/projects" }),
	});
	const { setEnabled, isPending: isToggling } = useToggleProjectEnabled();

	const enabled = project.spec.enabled !== false;
	const labels = Object.entries(project.metadata.labels ?? {});
	const team = (teamsData.items ?? []).find(
		(t) => t.metadata.id === project.spec.teamId,
	);
	const serviceAccountNames = new Map(
		(serviceAccounts.data?.items ?? []).map((sa) => [
			sa.metadata.id ?? "",
			displayLabel(sa.metadata),
		]),
	);

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/projects"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Projects
			</Link>

			<DetailPageHeader
				icon={Boxes}
				metadata={project.metadata}
				badges={<StatusBadge enabled={enabled} />}
			>
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => void setEnabled(project, !enabled)}
					toggling={isToggling}
					onDelete={() =>
						del.request({
							id: projectId,
							name: project.metadata.name,
							label: displayLabel(project.metadata),
						})
					}
					editLink={({ className, content }) => (
						<Link
							to="/projects/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				>
					<EraseBodiesButton
						scope={{
							project: {
								id: projectId,
								name: project.metadata.name,
								label: displayLabel(project.metadata),
								kind: "project",
							},
						}}
					/>
				</DetailHeaderActions>
			</DetailPageHeader>

			<DetailCard title="Configuration" icon={Users}>
				<dl className="divide-y divide-border">
					<DetailRow label="Team">
						{team ? (
							<Link
								to="/teams/$name"
								params={{ name: team.metadata.name }}
								className="text-foreground hover:underline"
							>
								{displayLabel(team.metadata)}
							</Link>
						) : (
							<code className="font-mono text-[11px]">
								{project.spec.teamId}
							</code>
						)}
					</DetailRow>
					<AccountPolicy
						accountRef={{ ownerOf: { kind: "project", id: projectId } }}
						attach={{
							slug: project.metadata.name,
							label: displayLabel(project.metadata),
							owner: { kind: "project", id: projectId },
						}}
					/>
					<InheritedPolicies
						accountRef={{ ownerOf: { kind: "project", id: projectId } }}
					/>
					{labels.length > 0 && (
						<DetailRow label="Labels">
							<div className="flex flex-wrap gap-1.5">
								{labels.map(([k, v]) => (
									<Chip key={k} label={`${k}=${v}`} mono />
								))}
							</div>
						</DetailRow>
					)}
				</dl>
			</DetailCard>

			<ScopeSpendCard
				spend={spend}
				unavailable={unavailable}
				breakdownLabel="By model"
				renderKey={(key) => <span className="font-mono">{key || "—"}</span>}
			/>

			<DetailCard title="Service accounts" icon={Bot}>
				{(serviceAccounts.data?.items ?? []).length === 0 ? (
					<DetailEmpty>This project has no service accounts yet.</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{(serviceAccounts.data?.items ?? []).map((sa) => (
							<li
								key={sa.metadata.name}
								className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-xs"
							>
								<Link
									to="/service-accounts/$name"
									params={{ name: sa.metadata.name }}
									className="text-foreground hover:underline"
								>
									{displayLabel(sa.metadata)}
								</Link>
								<StatusBadge enabled={sa.spec.enabled !== false} />
							</li>
						))}
					</ul>
				)}
			</DetailCard>

			<DetailCard title="Keys" icon={KeyRound}>
				{(keys.data?.items ?? []).length === 0 ? (
					<DetailEmpty>
						No keys are issued to this project's service accounts.
					</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{(keys.data?.items ?? []).map((k) => (
							<li
								key={k.metadata.name}
								className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-xs"
							>
								<Link
									to="/keys/$name"
									params={{ name: k.metadata.name }}
									className="text-foreground hover:underline"
								>
									{displayLabel(k.metadata)}
								</Link>
								<span className="text-muted-foreground">
									{serviceAccountNames.get(k.spec.principal.id) ?? "—"}
								</span>
							</li>
						))}
					</ul>
				)}
			</DetailCard>

			<DetailCard title="Policies" icon={ShieldCheck}>
				{(policies.data?.items ?? []).length === 0 ? (
					<DetailEmpty>This project owns no policies.</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{(policies.data?.items ?? []).map((p) => (
							<li
								key={p.metadata.name}
								className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-xs"
							>
								<Link
									to="/policies/$name"
									params={{ name: p.metadata.name }}
									className="text-foreground hover:underline"
								>
									{displayLabel(p.metadata)}
								</Link>
								<StatusBadge enabled={p.spec.enabled !== false} />
							</li>
						))}
					</ul>
				)}
			</DetailCard>

			<DetailCard
				title="Policy bindings"
				icon={ShieldCheck}
				action={
					<Link
						to="/policy-bindings/new"
						search={{ project_id: projectId }}
						className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
					>
						New policy binding
					</Link>
				}
			>
				{(policyBindings.data?.items ?? []).length === 0 ? (
					<DetailEmpty>This project owns no policy bindings.</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{(policyBindings.data?.items ?? []).map((b) => (
							<li key={b.metadata.name} className="py-2 first:pt-0 last:pb-0">
								<DetailRow
									label={
										<Link
											to="/policy-bindings/$name"
											params={{ name: b.metadata.name }}
											className="hover:underline"
										>
											{displayLabel(b.metadata)}
										</Link>
									}
								>
									{(b.spec.accountIds ?? []).length > 0 ? (
										<AccountChips accountIds={b.spec.accountIds ?? []} />
									) : (
										<span className="text-muted-foreground">no accounts</span>
									)}
								</DetailRow>
							</li>
						))}
					</ul>
				)}
			</DetailCard>

			<DetailCard
				title="Access at project scope"
				icon={ShieldCheck}
				action={
					<Link
						to="/role-bindings/new"
						search={{ scope_kind: "project", scope_id: projectId }}
						className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
					>
						New role binding
					</Link>
				}
			>
				{(roleBindings.data?.items ?? []).length === 0 ? (
					<DetailEmpty>
						No role bindings grant access at this project's scope.
					</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{(roleBindings.data?.items ?? []).map((b) => (
							<li key={b.metadata.name} className="py-2 first:pt-0 last:pb-0">
								<DetailRow
									label={
										<Link
											to="/role-bindings/$name"
											params={{ name: b.metadata.name }}
											className="hover:underline"
										>
											{displayLabel(b.metadata)}
										</Link>
									}
								>
									{(b.spec.subjects ?? []).map(subjectLabel).join(", ") ||
										"no subjects"}
								</DetailRow>
							</li>
						))}
					</ul>
				)}
			</DetailCard>

			<DetailCard title="References" icon={Link2}>
				<ReferencesList
					items={refs.items}
					empty="Nothing points at this project yet."
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
