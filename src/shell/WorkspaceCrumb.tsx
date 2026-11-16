import { useContextSwitcher } from "@/hooks/useContextSwitcher";
import { WorkspaceAvatar } from "@/shared/WorkspaceAvatar";
import { WorkspaceMenu } from "@/shared/WorkspaceMenu";
import { headerTriggerClass } from "@/shell/headerTrigger";
import { usePageSection } from "@/shell/usePageSection";

/** "Wyolet Relay / Usage": whose data the page shows; the workspace opens the switcher. */
export function WorkspaceCrumb() {
	const { current, currentTitle } = useContextSwitcher();
	const section = usePageSection();
	if (!current) return null;
	return (
		<nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
			<WorkspaceMenu
				aria-label={`Workspace: ${currentTitle}`}
				// The menu's trigger slot takes an element to render into; a button keeps it focusable.
				trigger={<button type="button" className={headerTriggerClass} />}
			>
				<WorkspaceAvatar context={current} size="sm" />
				<span className="max-w-48 truncate font-medium">{currentTitle}</span>
			</WorkspaceMenu>
			{section && (
				<>
					<span aria-hidden className="text-ink-3">
						/
					</span>
					<span className="truncate px-1.5 text-sm text-muted-foreground">
						{section}
					</span>
				</>
			)}
		</nav>
	);
}
