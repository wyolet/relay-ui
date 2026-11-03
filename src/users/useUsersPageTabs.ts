import { useCapabilities } from "@/api/hooks/capabilities";

/** Tabs of the Users page; each is named after the capability that lists it. */
export const USERS_PAGE_TABS = [
	"users",
	"groups",
	"roles",
	"role-bindings",
] as const;

export type UsersPageTab = (typeof USERS_PAGE_TABS)[number];

/**
 * The tabs the caller may list, and the one to show: the requested tab when
 * visible, else the first visible. `active` is undefined when none is.
 */
export function useUsersPageTabs(requested: UsersPageTab): {
	visible: UsersPageTab[];
	active: UsersPageTab | undefined;
} {
	const capabilities = useCapabilities();
	const visible = USERS_PAGE_TABS.filter((tab) => capabilities[tab]);
	const active = visible.includes(requested) ? requested : visible[0];
	return { visible, active };
}
