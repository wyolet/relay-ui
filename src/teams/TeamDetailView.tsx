import { Link, useNavigate } from "@tanstack/react-router";
import { Boxes, Building2, Link2, Users } from "lucide-react";
import { useProjectsInTeam } from "@/api/hooks/projects";
import { useDeleteTeam, useTeam, useTeamReferences } from "@/api/hooks/teams";
import { resolveWindow, useScopeSpend } from "@/api/hooks/usage";
import { displayLabel } from "@/lib/displayLabel";
import { AccountPolicy } from "@/policy-bindings/AccountPolicy";
import { ScopeRoleBindingsCard } from "@/role-bindings/ScopeRoleBindingsCard";
import { BackLink } from "@/shared/BackLink";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailListRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { ReferencesList } from "@/shared/ReferencesList";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { ShortcutActions } from "@/shortcuts/ShortcutActions";
import { ScopeSpendCard } from "@/teams/ScopeSpendCard";
import { useToggleTeamEnabled } from "@/teams/useToggleTeamEnabled";

export function TeamDetailView({ name }: { name: string }) {
	const { data: team } = useTeam(name);
	const { data: refs } = useTeamReferences(team.metadata.id);
	const teamId = team.metadata.id ?? "";
	const projects = useProjectsInTeam(teamId);
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
		<div>
			<DetailPageHeader
				back={<BackLink to="/teams">Teams</BackLink>}
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
				>
					<ShortcutActions
						target={{
							kind: "team",
							id: teamId,
							name: team.metadata.name,
							label: displayLabel(team.metadata),
						}}
					/>
				</DetailHeaderActions>
			</DetailPageHeader>

			<div className="flex flex-col gap-5">
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
							attach={{
								label: displayLabel(team.metadata),
								owner: { kind: "team", id: teamId },
							}}
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
								<DetailListRow key={p.metadata.name}>
									<Link
										to="/projects/$name"
										params={{ name: p.metadata.name }}
										className="text-foreground hover:underline"
									>
										{displayLabel(p.metadata)}
									</Link>
									<StatusBadge enabled={p.spec.enabled !== false} />
								</DetailListRow>
							))}
						</ul>
					)}
				</DetailCard>

				<ScopeRoleBindingsCard scopeKind="team" scopeId={teamId} />

				<DetailCard title="References" icon={Link2}>
					<ReferencesList
						items={refs.items}
						empty="Nothing points at this team yet."
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
		</div>
	);
}
