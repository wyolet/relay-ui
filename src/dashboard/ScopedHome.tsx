import { Link } from "@tanstack/react-router";
import { Boxes, KeyRound, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/api/auth";
import { displayLabel } from "@/lib/displayLabel";
import { DetailCard, DetailEmpty } from "@/shared/DetailCard";
import { StatusBadge } from "@/shared/StatusBadge";
import { ScopeSpendCard } from "@/teams/ScopeSpendCard";
import { useScopedHome } from "./useScopedHome";

/**
 * Home for an actor scoped to teams/projects rather than the whole relay:
 * where they belong, what they can call with, and what it cost this month.
 * The operations block and fleet-wide traffic band stay admin-only — a
 * scoped actor can neither read nor act on them.
 */
export function ScopedHome() {
	const { username } = useAuth();
	const { teams, projects, keys, spend, spendUnavailable, pending } =
		useScopedHome();
	const projectNames = new Map(
		projects.map((p) => [p.metadata.id ?? "", displayLabel(p.metadata)]),
	);

	return (
		<div className="flex flex-col gap-4">
			<p className="text-xs text-muted-foreground">
				Signed in as{" "}
				<span className="font-medium text-foreground">{username}</span>.
			</p>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<DetailCard title="My teams" icon={Users}>
					<ScopeList
						pending={pending}
						empty="No team grants."
						items={teams.map((t) => ({
							id: t.metadata.id ?? t.metadata.name,
							enabled: t.spec.enabled !== false,
							content: (
								<Link
									to="/teams/$name"
									params={{ name: t.metadata.name }}
									className="truncate hover:text-foreground"
								>
									{displayLabel(t.metadata)}
								</Link>
							),
						}))}
					/>
				</DetailCard>

				<DetailCard title="My projects" icon={Boxes}>
					<ScopeList
						pending={pending}
						empty="No project grants."
						items={projects.map((p) => ({
							id: p.metadata.id ?? p.metadata.name,
							enabled: p.spec.enabled !== false,
							content: (
								<Link
									to="/projects/$name"
									params={{ name: p.metadata.name }}
									className="truncate hover:text-foreground"
								>
									{displayLabel(p.metadata)}
								</Link>
							),
						}))}
					/>
				</DetailCard>

				<DetailCard title="My keys" icon={KeyRound}>
					<ScopeList
						pending={false}
						empty="No keys issued to you yet."
						items={keys.map((k) => ({
							id: k.metadata.id ?? k.metadata.name,
							enabled: k.spec.enabled !== false,
							content: (
								<Link
									to="/keys/$name"
									params={{ name: k.metadata.name }}
									className="flex min-w-0 items-center gap-2 hover:text-foreground"
								>
									<span className="truncate">{displayLabel(k.metadata)}</span>
									{k.spec.prefix && (
										<code className="shrink-0 font-mono text-[11px] text-muted-foreground">
											{k.spec.prefix}…
										</code>
									)}
								</Link>
							),
						}))}
					/>
				</DetailCard>

				<ScopeSpendCard
					spend={spend}
					unavailable={spendUnavailable}
					breakdownLabel="By project"
					renderKey={(id) => projectNames.get(id) ?? id}
				/>
			</div>
		</div>
	);
}

interface ScopeListItem {
	id: string;
	enabled: boolean;
	content: ReactNode;
}

function ScopeList({
	items,
	empty,
	pending,
}: {
	items: ScopeListItem[];
	empty: string;
	pending: boolean;
}) {
	if (pending) return <DetailEmpty>Loading…</DetailEmpty>;
	if (items.length === 0) return <DetailEmpty>{empty}</DetailEmpty>;
	return (
		<ul className="divide-y divide-border">
			{items.map((it) => (
				<li
					key={it.id}
					className="flex items-center justify-between gap-3 py-2 text-xs first:pt-0 last:pb-0"
				>
					<span className="min-w-0 truncate text-foreground">{it.content}</span>
					<StatusBadge enabled={it.enabled} />
				</li>
			))}
		</ul>
	);
}
