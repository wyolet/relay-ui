import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ShortcutTarget } from "@/shortcuts/registry";

export function AddLimitAction({ target }: { target: ShortcutTarget }) {
	return (
		<Link
			to="/limits/add"
			search={{ targetKind: target.kind, id: target.id }}
			className={buttonVariants({ variant: "outline", size: "lg" })}
		>
			<Gauge className="size-3.5" />
			Add a limit
		</Link>
	);
}
