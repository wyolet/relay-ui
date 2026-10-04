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
import { useState } from "react";
import { useKeysForPrincipals } from "@/api/hooks/keys";
import { useProjectPolicies } from "@/api/hooks/policies";
import { usePolicyBindingsInProject } from "@/api/hooks/policyBindings";
import {
	useDeleteProject,
	useProject,
	useProjectReferences,
} from "@/api/hooks/projects";
import { useRoleBindingsAtScope } from "@/api/hooks/roleBindings";
import { useServiceAccountsInProject } from "@/api/hooks/serviceAccounts";
import { useTeams } from "@/api/hooks/teams";
import { resolveWindow, useScopeSpend } from "@/api/hooks/usage";
import { ApiError } from "@/api/types/errors";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { useToggleProjectEnabled } from "@/projects/useToggleProjectEnabled";
import { subjectLabel } from "@/role-bindings/SubjectsEditor";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { StatusBadge } from "@/shared/StatusBadge";
import { toast } from "@/shared/Toast";
import { BudgetCard } from "@/teams/BudgetCard";
import { ScopeSpendCard } from "@/teams/ScopeSpendCard";

export function ProjectDetailView({ name }: { name: string }) {
	const { data: project } = useProject(name);
	const { data: refs } = useProjectReferences(project.metadata.id);
	const { data: teamsData } = useTeams();
	const projectId = project.metadata.id ?? "";
	const serviceAccounts = useServiceAccountsInProject(projectId);
	const accountIds = (serviceAccounts.data?.items ?? [])
		.map((sa) => sa.metadata.id ?? "")
		.filter((id) => id.length > 0);
	const keys = useKeysForPrincipals(accountIds);
	const policies = useProjectPolicies(projectId);
	const policyBindings = usePolicyBindingsInProject(projectId);
	const roleBindings = useRoleBindingsAtScope("project", projectId);
	const period = resolveWindow("month");
	const { spend, unavailable } = useScopeSpend(
		"project_id",
		projectId,
		"model",
		period,
	);
	const deleteProject = useDeleteProject();
	const { setEnabled, isPending: isToggling } = useToggleProjectEnabled();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);

	const enabled = project.spec.enabled !== false;
	const description = project.metadata.description?.trim();
	const labels = Object.entries(project.metadata.labels ?? {});
	const team = (teamsData.items ?? []).find(
		(t) => t.metadata.id === project.spec.teamId,
	);
	const accountNames = new Map(
		(serviceAccounts.data?.items ?? []).map((sa) => [
			sa.metadata.id ?? "",
			displayLabel(sa.metadata),
		]),
	);

	async function handleDelete() {
		try {
			await deleteProject.mutateAsync(projectId);
			toast("success", `Project "${displayLabel(project.metadata)}" deleted.`);
			void navigate({ to: "/projects" });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete project.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/projects"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Projects
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<Boxes className="w-4 h-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(project.metadata)}
							{!hasDisplayName(project.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							<StatusBadge enabled={enabled} />
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{project.metadata.name}
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
					onToggle={() => void setEnabled(project, !enabled)}
					toggling={isToggling}
					onDelete={() => setConfirming(true)}
					editLink={({ className, content }) => (
						<Link
							to="/projects/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</header>

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

			<BudgetCard budget={project.spec.budget} />

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
									{accountNames.get(k.spec.principal.id) ?? "—"}
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
					<DetailEmpty>
						No policy binding routes this project's callers to a policy.
					</DetailEmpty>
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
									priority {b.spec.priority ?? 0} ·{" "}
									{(b.spec.subjects ?? []).map(subjectLabel).join(", ") ||
										"no subjects"}
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
				{(refs.items ?? []).length === 0 ? (
					<DetailEmpty>Nothing points at this project yet.</DetailEmpty>
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
			</DetailCard>

			{confirming && (
				<DeleteConfirm
					resourceName={project.metadata.name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteProject.isPending}
				/>
			)}
		</div>
	);
}
