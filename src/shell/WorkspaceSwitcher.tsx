import { ChevronsUpDown, type LucideIcon, UserRound } from "lucide-react";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useContextSwitcher } from "@/hooks/useContextSwitcher";
import { WORKSPACE_ICON, WorkspaceMenu } from "@/shared/WorkspaceMenu";

function WorkspaceLines({
	icon: Icon,
	title,
	subtitle,
}: {
	icon: LucideIcon;
	title: string;
	subtitle: string;
}) {
	return (
		<>
			<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
				<Icon aria-hidden />
			</span>
			<span className="grid min-w-0 flex-1 leading-tight">
				<span className="truncate text-sm font-medium text-foreground">
					{title}
				</span>
				<span className="truncate text-[11px] text-muted-foreground">
					{subtitle}
				</span>
			</span>
		</>
	);
}

/** The sidebar's workspace switcher; hidden until the caller's contexts load. */
export function WorkspaceSwitcher() {
	const { current, currentTitle, currentSubtitle, noContext } =
		useContextSwitcher();

	if (noContext) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton
						size="lg"
						tooltip="No account"
						render={<div />}
						className="cursor-default hover:before:opacity-0"
					>
						<WorkspaceLines
							icon={UserRound}
							title="No account"
							subtitle="Workspace"
						/>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}
	if (!current) return null;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<WorkspaceMenu
					aria-label={`Workspace: ${currentTitle}`}
					trigger={
						<SidebarMenuButton
							size="lg"
							tooltip={currentTitle}
							className="data-popup-open:text-sidebar-accent-foreground data-popup-open:before:opacity-100"
						/>
					}
				>
					<WorkspaceLines
						icon={WORKSPACE_ICON[current.kind]}
						title={currentTitle}
						subtitle={currentSubtitle}
					/>
					<ChevronsUpDown className="ml-auto text-muted-foreground" />
				</WorkspaceMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
