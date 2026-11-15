import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/api/auth";
import { useCapabilities } from "@/api/hooks/capabilities";
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
import { isActive, NAV_GROUPS, type NavItem } from "@/shell/nav";
import { WorkspaceSwitcher } from "@/shell/WorkspaceSwitcher";

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
		<SidebarRoot collapsible="icon" variant="inset">
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
					<SidebarGroup key={group.label ?? "main"}>
						{group.label && (
							<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
						)}
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
