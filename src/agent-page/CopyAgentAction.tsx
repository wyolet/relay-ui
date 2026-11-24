import { Link } from "@tanstack/react-router";
import { CopyPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ShortcutTarget } from "@/shortcuts/registry";

export function CopyAgentAction({ target }: { target: ShortcutTarget }) {
	return (
		<Link
			to="/service-accounts/add-agent"
			search={{ from: target.id }}
			className={buttonVariants({ variant: "outline", size: "lg" })}
		>
			<CopyPlus className="size-3.5" />
			Add an agent like this
		</Link>
	);
}
