import { Link, useNavigate } from "@tanstack/react-router";
import {
	Boxes,
	Building2,
	ChevronLeft,
	Link2,
	ShieldCheck,
	Users,
} from "lucide-react";
import { useProjectsInTeam } from "@/api/hooks/projects";
import { useRoleBindingsAtScope } from "@/api/hooks/roleBindings";
import { useDeleteTeam, useTeam, useTeamReferences } from "@/api/hooks/teams";
import { resolveWindow, useScopeSpend } from "@/api/hooks/usage";
import { displayLabel } from "@/lib/displayLabel";
import { AccountPolicy } from "@/policy-bindings/AccountPolicy";
import { subjectLabel } from "@/role-bindings/SubjectsEditor";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { ScopeSpendCard } from "@/teams/ScopeSpendCard";
import { useToggleTeamEnabled } from "@/teams/useToggleTeamEnabled";

export function TeamDetailView({ name }: { name: string }) {
	const { data: team } = useTeam(name);
	const { data: refs } = useTeamReferences(team.metadata.id);
	const teamId = team.metadata.id ?? "";
	const projects = useProjectsInTeam(teamId);
	const bindings = useRoleBindingsAtScope("team", teamId);
	const period = resolveWindow("month");
	const { spend, unavailable } = useScopeSpend(
		"team_id",
		teamId,
		"project_id",
		period,
	);
	const { setEnabled, isPending: isToggling } = useToggleTeamEnabled();
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeleteTeam(), {
		noun: "team",
		onDeleted: () => void navigate({ to: "/teams" }),
	});

	const enabled = team.spec.enabled !== false;
	const labels = Object.entries(team.metadata.labels ?? {});
	const projectItems = projects.data?.items ?? [];
	const projectNames = new Map(
		projectItems.map((p) => [
			p.metadata.id ?? "",
			{ name: p.metadata.name, label: displayLabel(p.metadata) },
		]),
	);

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/teams"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Teams
			</Link>

			<DetailPageHeader
				icon={Users}
				metadata={team.metadata}
				badges={<StatusBadge enabled={enabled} />}
			>
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => void setEnabled(team, !enabled)}
					toggling={isToggling}
					onDelete={() =>
						del.request({
							id: teamId,
							name: team.metadata.name,
							label: displayLabel(team.metadata),
						})
					}
					editLink={({ className, content }) => (
						<Link
							to="/teams/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</DetailPageHeader>

			{labels.length > 0 && (
				<DetailCard title="Labels" icon={Users}>
					<div className="flex flex-wrap gap-1.5">
						{labels.map(([k, v]) => (
							<Chip key={k} label={`${k}=${v}`} mono />
						))}
					</div>
				</DetailCard>
			)}

			<DetailCard title="Account" icon={Building2}>
				<dl className="divide-y divide-border">
					<AccountPolicy
						accountRef={{ ownerOf: { kind: "team", id: teamId } }}
					/>
				</dl>
			</DetailCard>

			<ScopeSpendCard
				spend={spend}
				unavailable={unavailable}
				breakdownLabel="By project"
				renderKey={(key) => {
					const p = projectNames.get(key);
					return p ? (
						<Link
							to="/projects/$name"
							params={{ name: p.name }}
							className="hover:underline"
						>
							{p.label}
						</Link>
					) : (
						<span className="font-mono">{key.slice(0, 8)}…</span>
					);
				}}
			/>

			<DetailCard
				title="Projects"
				icon={Boxes}
				action={
					<Link
						to="/projects/new"
						search={{ team_id: teamId }}
						className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
					>
						New project
					</Link>
				}
			>
				{projectItems.length === 0 ? (
					<DetailEmpty>This team has no projects yet.</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{projectItems.map((p) => (
							<li
								key={p.metadata.name}
								className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-xs"
							>
								<Link
									to="/projects/$name"
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
				title="Access at team scope"
				icon={ShieldCheck}
				action={
					<Link
						to="/role-bindings/new"
						search={{ scope_kind: "team", scope_id: teamId }}
						className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
					>
						New role binding
					</Link>
				}
			>
				{(bindings.data?.items ?? []).length === 0 ? (
					<DetailEmpty>
						No role bindings grant access at this team's scope.
					</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{(bindings.data?.items ?? []).map((b) => (
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
					<DetailEmpty>Nothing points at this team yet.</DetailEmpty>
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
