import { Link, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	Banknote,
	BarChart3,
	Bot,
	Boxes,
	KeyRound,
	LayoutDashboard,
	ShieldCheck,
	UserRound,
	Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { useAuth } from "@/api/auth";
import { type Capability, useCapabilities } from "@/api/hooks/capabilities";
import {
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	Sidebar as SidebarRoot,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/shared/BrandMark";
import { WorkspaceSwitcher } from "@/shell/WorkspaceSwitcher";
import { USERS_PAGE_TABS } from "@/users/useUsersPageTabs";

interface NavItem {
	to:
		| "/"
		| "/usage"
		| "/logs"
		| "/models"
		| "/keys"
		| "/policies"
		| "/pricing"
		| "/service-accounts"
		| "/teams"
		| "/projects"
		| "/audit"
		| "/users"
		| "/scim-clients";
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

interface NavGroup {
	label: string;
	items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
	{
		label: "Observe",
		items: [
			{ to: "/", label: "Overview", icon: LayoutDashboard, prefix: "/" },
			{ to: "/usage", label: "Usage", icon: BarChart3, prefix: "/usage" },
			{ to: "/logs", label: "Logs", icon: Activity, prefix: "/logs" },
		],
	},
	{
		label: "Configure",
		items: [
			{
				to: "/models",
				label: "Models",
				icon: Boxes,
				prefix: "/models",
				capability: "models",
			},
			{
				to: "/keys",
				label: "Keys",
				icon: KeyRound,
				prefix: "/keys",
				capability: "keys",
			},
			{
				to: "/policies",
				label: "Policies",
				icon: ShieldCheck,
				prefix: "/policies",
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

function isActive(path: string, item: NavItem): boolean {
	if (item.to === "/") return path === "/";
	return [item.prefix].flat().some((prefix) => path.startsWith(prefix));
}

function NavMenuItem({ item, active }: { item: NavItem; active: boolean }) {
	const Icon = item.icon;
	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				isActive={active}
				tooltip={item.label}
				render={
					<Link to={item.to} aria-current={active ? "page" : undefined} />
				}
			>
				<Icon />
				<span>{item.label}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

export function Sidebar() {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const capabilities = useCapabilities();
	const { isAdmin } = useAuth();
	const visible = (item: NavItem) =>
		(!item.adminOnly || isAdmin) &&
		(!item.capability ||
			[item.capability].flat().some((kind) => capabilities[kind]));

	return (
		<SidebarRoot collapsible="icon">
			<SidebarHeader>
				<div className="flex h-9 items-center gap-2.5 px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<BrandMark className="h-5 w-auto shrink-0" />
					<div className="flex items-baseline gap-1.5 overflow-hidden group-data-[collapsible=icon]:hidden">
						<span className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
							Wyolet
						</span>
						<span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
							Relay
						</span>
					</div>
				</div>
				<WorkspaceSwitcher />
			</SidebarHeader>

			<SidebarContent>
				{NAV_GROUPS.map((group) => (
					<SidebarGroup key={group.label}>
						<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
						<SidebarMenu>
							{group.items.filter(visible).map((item) => (
								<NavMenuItem
									key={item.to}
									item={item}
									active={isActive(path, item)}
								/>
							))}
						</SidebarMenu>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarRail />
		</SidebarRoot>
	);
}
