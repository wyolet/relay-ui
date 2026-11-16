import { useRouterState } from "@tanstack/react-router";
import { navItemFor } from "@/shell/nav";

/** The nav section the current page sits under, as the sidebar names it. */
export function usePageSection(): string | undefined {
	const path = useRouterState({ select: (s) => s.location.pathname });
	return navItemFor(path)?.label;
}
