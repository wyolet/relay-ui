import {
	Banknote,
	BarChart3,
	Bot,
	Boxes,
	BrainCircuit,
	Cog,
	KeyRound,
	LayoutDashboard,
	ShieldCheck,
	UserRound,
	Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Capability } from "@/api/hooks/capabilities";
import { USERS_PAGE_TABS } from "@/users/useUsersPageTabs";

export interface NavItem {
	to:
		| "/"
		| "/usage"
		| "/models"
		| "/keys"
		| "/policies"
		| "/pricing"
		| "/service-accounts"
		| "/teams"
		| "/projects"
		| "/audit"
		| "/users"
		| "/scim-clients"
		| "/settings";
	label: string;
	icon: ComponentType<{ className?: string }>;
	/** Path prefixes that highlight the entry; a tabbed page lists every tab's
	 * detail routes too. */
	prefix: string | readonly string[];
	/** Entry hides when the actor may list none of these kinds. Observe views
	 * have none — they degrade to their own empty states instead. */
	capability?: Capability | readonly Capability[];
	/** Entry hides from non-admins: the kind takes an admin in every authz mode. */
	adminOnly?: boolean;
}

export interface NavGroup {
	/** Section heading; the main group runs unlabeled at the top. */
	label?: string;
	items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
	{
		items: [
			{ to: "/", label: "Dashboard", icon: LayoutDashboard, prefix: "/" },
			{
				to: "/usage",
				label: "Usage",
				icon: BarChart3,
				prefix: ["/usage", "/logs"],
			},
			{
				to: "/models",
				label: "Models",
				icon: BrainCircuit,
				prefix: ["/models", "/hosts", "/providers"],
				capability: "models",
			},
			{
				to: "/keys",
				label: "Keys",
				icon: KeyRound,
				prefix: ["/keys", "/host-keys", "/accounts", "/pools", "/me/accounts"],
				capability: "keys",
			},
			{
				to: "/policies",
				label: "Policies",
				icon: ShieldCheck,
				prefix: ["/policies", "/policy-bindings"],
				capability: "policies",
			},
			{
				to: "/pricing",
				label: "Pricing",
				icon: Banknote,
				prefix: "/pricing",
				capability: "pricings",
			},
		],
	},
	{
		label: "Identity",
		items: [
			{
				to: "/teams",
				label: "Teams",
				icon: Users,
				prefix: "/teams",
				capability: "teams",
			},
			{
				to: "/projects",
				label: "Projects",
				icon: Boxes,
				prefix: "/projects",
				capability: "projects",
			},
			{
				to: "/service-accounts",
				label: "Service accounts",
				icon: Bot,
				prefix: "/service-accounts",
				capability: "service-accounts",
			},
			{
				to: "/users",
				label: "Users",
				icon: UserRound,
				prefix: ["/users", "/groups", "/roles", "/role-bindings"],
				capability: USERS_PAGE_TABS,
			},
		],
	},
];

export function isActive(path: string, item: NavItem): boolean {
	if (item.to === "/") return path === "/";
	return [item.prefix].flat().some((prefix) => path.startsWith(prefix));
}

/** Pinned to the sidebar's foot, above the account. */
export const SETTINGS_ITEM: NavItem = {
	to: "/settings",
	label: "Settings",
	icon: Cog,
	// Audit and SCIM clients open from Settings rows.
	prefix: ["/settings", "/audit", "/scim-clients"],
	adminOnly: true,
};

/** The nav entry a path sits under; none for pages outside the nav. */
export function navItemFor(path: string): NavItem | undefined {
	return [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM].find((item) =>
		isActive(path, item),
	);
}
