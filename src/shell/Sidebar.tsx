import { Link, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	Banknote,
	BarChart3,
	Boxes,
	KeyRound,
	LayoutDashboard,
	ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";
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

interface NavItem {
	to: "/" | "/usage" | "/logs" | "/models" | "/keys" | "/policies" | "/pricing";
	label: string;
	icon: ComponentType<{ className?: string }>;
	prefix: string;
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
			{ to: "/models", label: "Models", icon: Boxes, prefix: "/models" },
			{ to: "/keys", label: "Keys", icon: KeyRound, prefix: "/keys" },
			{
				to: "/policies",
				label: "Policies",
				icon: ShieldCheck,
				prefix: "/policies",
			},
			{
				to: "/pricing",
				label: "Pricing",
				icon: Banknote,
				prefix: "/pricing",
			},
		],
	},
];

function isActive(path: string, item: NavItem): boolean {
	if (item.to === "/") return path === "/";
	return path.startsWith(item.prefix);
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
			</SidebarHeader>

			<SidebarContent>
				{NAV_GROUPS.map((group) => (
					<SidebarGroup key={group.label}>
						<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
						<SidebarMenu>
							{group.items.map((item) => (
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
