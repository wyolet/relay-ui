import { Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ShortcutTarget } from "@/shortcuts/registry";

/** The detail-page action that opens Set access for the page's row. */
export function SetAccessAction({ target }: { target: ShortcutTarget }) {
	return (
		<Link
			to="/access/set"
			search={{ targetKind: target.kind, id: target.id }}
			className={buttonVariants({ variant: "outline", size: "lg" })}
		>
			<SlidersHorizontal className="size-3.5" />
			Set access
		</Link>
	);
}
