import { Link } from "@tanstack/react-router";
import { shortId } from "@/accounts/accountView";
import type { components } from "@/api/types.gen";

type AccountScope = components["schemas"]["AccountScope"];

const linkClass = "text-xs text-foreground hover:underline";

const SCOPE_LABELS: Record<AccountScope["kind"], string> = {
	user: "User",
	team: "Team",
	project: "Project",
};

/** The user, team or project an account sits in; unlinked once the row is gone. */
export function AccountScopeLink({ scope }: { scope: AccountScope }) {
	return (
		<span className="inline-flex items-baseline gap-1.5">
			<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
				{SCOPE_LABELS[scope.kind]}
			</span>
			<ScopeTarget scope={scope} />
		</span>
	);
}

function ScopeTarget({ scope }: { scope: AccountScope }) {
	if (scope.name === "") {
		return (
			<span className="font-mono text-[11px] text-muted-foreground">
				{shortId(scope.id)} (gone)
			</span>
		);
	}
	if (scope.kind === "user") {
		return (
			<Link to="/users/$id" params={{ id: scope.id }} className={linkClass}>
				{scope.name}
			</Link>
		);
	}
	if (scope.kind === "team") {
		return (
			<Link
				to="/teams/$name"
				params={{ name: scope.name }}
				className={linkClass}
			>
				{scope.name}
			</Link>
		);
	}
	return (
		<Link
			to="/projects/$name"
			params={{ name: scope.name }}
			className={linkClass}
		>
			{scope.name}
		</Link>
	);
}
