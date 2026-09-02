import { Link, useNavigate } from "@tanstack/react-router";
import { Boxes, ChevronLeft, Link2, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { useProjectsInTeam } from "@/api/hooks/projects";
import { useRoleBindingsAtScope } from "@/api/hooks/roleBindings";
import { useDeleteTeam, useTeam, useTeamReferences } from "@/api/hooks/teams";
import { resolveWindow, useScopeSpend } from "@/api/hooks/usage";
import { ApiError } from "@/api/types/errors";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { StatusBadge } from "@/shared/StatusBadge";
import { toast } from "@/shared/Toast";
import { BudgetCard } from "@/teams/BudgetCard";
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
	const deleteTeam = useDeleteTeam();
	const { setEnabled, isPending: isToggling } = useToggleTeamEnabled();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);

	const enabled = team.spec.enabled !== false;
	const description = team.metadata.description?.trim();
	const labels = Object.entries(team.metadata.labels ?? {});
	const projectItems = projects.data?.items ?? [];
	const projectNames = new Map(
		projectItems.map((p) => [
			p.metadata.id ?? "",
			{ name: p.metadata.name, label: displayLabel(p.metadata) },
		]),
	);

	async function handleDelete() {
		try {
			await deleteTeam.mutateAsync(teamId);
			toast("success", `Team "${displayLabel(team.metadata)}" deleted.`);
			void navigate({ to: "/teams" });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete team.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/teams"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Teams
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<Users className="w-4 h-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(team.metadata)}
							{!hasDisplayName(team.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							<StatusBadge enabled={enabled} />
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{team.metadata.name}
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
					onToggle={() => void setEnabled(team, !enabled)}
					toggling={isToggling}
					onDelete={() => setConfirming(true)}
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
			</header>

			{labels.length > 0 && (
				<DetailCard title="Labels" icon={Users}>
					<div className="flex flex-wrap gap-1.5">
						{labels.map(([k, v]) => (
							<Chip key={k} label={`${k}=${v}`} mono />
						))}
					</div>
				</DetailCard>
			)}

			<BudgetCard budget={team.spec.budget} />

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

			<DetailCard title="Access at team scope" icon={ShieldCheck}>
				{(bindings.data?.items ?? []).length === 0 ? (
					<DetailEmpty>
						No role bindings grant access at this team's scope.
					</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{(bindings.data?.items ?? []).map((b) => (
							<li key={b.metadata.name} className="py-2 first:pt-0 last:pb-0">
								<DetailRow label={displayLabel(b.metadata)}>
									{(b.spec.subjects ?? [])
										.map((s) => `${s.kind}:${s.name ?? s.id ?? ""}`)
										.join(", ") || "no subjects"}
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

			{confirming && (
				<DeleteConfirm
					resourceName={team.metadata.name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteTeam.isPending}
				/>
			)}
		</div>
	);
}
