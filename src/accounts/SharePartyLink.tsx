import { Link } from "@tanstack/react-router";
import { Bot, Boxes, Server, User, Users } from "lucide-react";
import { partyName } from "@/accounts/accountView";
import { partyKindLabel } from "@/accounts/sharing";
import type { AccountShareParty } from "@/api/hooks/accounts";

const linkClass =
	"inline-flex items-center gap-1 text-xs text-foreground hover:underline";

const ICONS = {
	system: Server,
	user: User,
	team: Users,
	project: Boxes,
	serviceaccount: Bot,
} as const;

/** A share's receiver or sharer, linked to its page when the caller can see it. */
export function SharePartyLink({ party }: { party: AccountShareParty }) {
	const Icon = ICONS[party.kind];
	const content = (
		<>
			<Icon className="w-3 h-3 text-muted-foreground" aria-hidden />
			{partyName(party)}
		</>
	);
	const title = partyKindLabel(party.kind);
	const name = party.name ?? "";
	if (party.kind === "user" && party.id) {
		return (
			<Link
				to="/users/$id"
				params={{ id: party.id }}
				className={linkClass}
				title={title}
			>
				{content}
			</Link>
		);
	}
	if (party.kind === "team" && name) {
		return (
			<Link
				to="/teams/$name"
				params={{ name }}
				className={linkClass}
				title={title}
			>
				{content}
			</Link>
		);
	}
	if (party.kind === "project" && name) {
		return (
			<Link
				to="/projects/$name"
				params={{ name }}
				className={linkClass}
				title={title}
			>
				{content}
			</Link>
		);
	}
	if (party.kind === "serviceaccount" && name) {
		return (
			<Link
				to="/service-accounts/$name"
				params={{ name }}
				className={linkClass}
				title={title}
			>
				{content}
			</Link>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 text-xs text-foreground">
			{content}
		</span>
	);
}
