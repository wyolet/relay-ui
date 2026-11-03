import { Link } from "@tanstack/react-router";
import { Bot, User } from "lucide-react";
import type { HolderView } from "@/accounts/accountView";

const linkClass =
	"inline-flex items-baseline gap-1 text-xs text-foreground hover:underline";

/** A user or service account, linked to its page once it resolves. */
export function AccountHolderLink({ holder }: { holder: HolderView }) {
	if (holder.kind === "user") {
		return (
			<Link to="/users/$id" params={{ id: holder.id }} className={linkClass}>
				<User className="w-3 h-3 self-center text-muted-foreground" aria-hidden />
				{holder.label}
			</Link>
		);
	}
	if (holder.serviceAccountName) {
		return (
			<Link
				to="/service-accounts/$name"
				params={{ name: holder.serviceAccountName }}
				className={linkClass}
			>
				<Bot className="w-3 h-3 self-center text-muted-foreground" aria-hidden />
				{holder.label}
			</Link>
		);
	}
	return (
		<span className="inline-flex items-baseline gap-1 text-xs text-foreground">
			<Bot className="w-3 h-3 self-center text-muted-foreground" aria-hidden />
			<span className="font-mono">{holder.label}</span>
		</span>
	);
}
