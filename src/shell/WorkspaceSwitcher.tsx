import { ChevronsUpDown, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useContextSwitcher } from "@/hooks/useContextSwitcher";
import { WorkspaceAvatar } from "@/shared/WorkspaceAvatar";
import { WorkspaceMenu } from "@/shared/WorkspaceMenu";

function WorkspaceLines({
	mark,
	title,
	subtitle,
}: {
	mark: ReactNode;
	title: string;
	subtitle: string;
}) {
	return (
		<>
			{mark}
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
							mark={
								<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
									<UserRound aria-hidden />
								</span>
							}
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
							// Raised a step off the sidebar ground: it sets every page's data, unlike the nav below.
							className="bg-card shadow-sm ring-1 ring-sidebar-border data-popup-open:text-sidebar-accent-foreground data-popup-open:before:opacity-100"
						/>
					}
				>
					<WorkspaceLines
						mark={<WorkspaceAvatar context={current} />}
						title={currentTitle}
						subtitle={currentSubtitle}
					/>
					<ChevronsUpDown className="ml-auto text-muted-foreground" />
				</WorkspaceMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
