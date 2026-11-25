import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useNewKeySearch } from "@/agent-page/useNewKeySearch";
import { buttonVariants } from "@/components/ui/button";
import type { ShortcutTarget } from "@/shortcuts/registry";

export function NewKeyAction({ target }: { target: ShortcutTarget }) {
	const search = useNewKeySearch(target);
	if (!search) return null;
	return (
		<Link
			to="/keys/new"
			search={search}
			className={buttonVariants({ variant: "outline", size: "lg" })}
		>
			<KeyRound className="size-3.5" />
			New key
		</Link>
	);
}
