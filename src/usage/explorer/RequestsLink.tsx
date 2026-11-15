import { Link } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { logsSearch } from "./search";
import { useExplorer } from "./useExplorer";

/** Opens Logs on the requests behind the current view. */
export function RequestsLink() {
	const { live } = useExplorer();
	return (
		<Link
			to="/logs"
			search={logsSearch(live)}
			className={buttonVariants({ variant: "outline" })}
		>
			<ScrollText aria-hidden />
			Requests
		</Link>
	);
}
