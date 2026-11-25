import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useRoleBindingsAtScope } from "@/api/hooks/roleBindings";
import { displayLabel } from "@/lib/displayLabel";
import { SubjectChips } from "@/role-bindings/SubjectChips";
import { DetailCard, DetailEmpty, DetailListRow } from "@/shared/DetailCard";

/** The role bindings granted at a team's or project's scope, each with its subjects. */
export function ScopeRoleBindingsCard({
	scopeKind,
	scopeId,
}: {
	scopeKind: "team" | "project";
	scopeId: string;
}) {
	const bindings = useRoleBindingsAtScope(scopeKind, scopeId);
	const items = bindings.data?.items ?? [];
	return (
		<DetailCard
			title={`Access at ${scopeKind} scope`}
			icon={ShieldCheck}
			action={
				<Link
					to="/role-bindings/new"
					search={{ scope_kind: scopeKind, scope_id: scopeId }}
					className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
				>
					New role binding
				</Link>
			}
		>
			{items.length === 0 ? (
				<DetailEmpty>
					No role bindings grant access at this {scopeKind}'s scope.
				</DetailEmpty>
			) : (
				<ul className="divide-y divide-border">
					{items.map((b) => (
						<DetailListRow key={b.metadata.name}>
							<Link
								to="/role-bindings/$name"
								params={{ name: b.metadata.name }}
								className="min-w-0 truncate text-foreground hover:underline"
							>
								{displayLabel(b.metadata)}
							</Link>
							{(b.spec.subjects ?? []).length > 0 ? (
								<SubjectChips subjects={b.spec.subjects ?? []} />
							) : (
								<span className="text-muted-foreground">No subjects</span>
							)}
						</DetailListRow>
					))}
				</ul>
			)}
		</DetailCard>
	);
}
