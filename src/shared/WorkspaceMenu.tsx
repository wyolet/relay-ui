import { Boxes, type LucideIcon, Server, UserRound, Users } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContextSwitcher } from "@/hooks/useContextSwitcher";
import { contextKey, contextLabel, type WorkContext } from "@/lib/workContext";

export const WORKSPACE_ICON: Record<WorkContext["kind"], LucideIcon> = {
	personal: UserRound,
	system: Server,
	team: Users,
	project: Boxes,
};

interface WorkspaceMenuProps {
	/** The element the menu opens from, rendered with `children` inside. */
	trigger: ReactElement;
	children: ReactNode;
	"aria-label"?: string;
	align?: "start" | "center" | "end";
}

/** Picks the workspace new rows land in; the sidebar switcher and create forms open it. */
export function WorkspaceMenu({
	trigger,
	children,
	"aria-label": ariaLabel,
	align = "start",
}: WorkspaceMenuProps) {
	const { rows, currentKey, selectKey, personalOffNote } = useContextSwitcher();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={trigger} aria-label={ariaLabel}>
				{children}
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align} sideOffset={6} className="min-w-60">
				<DropdownMenuRadioGroup value={currentKey} onValueChange={selectKey}>
					<DropdownMenuLabel className="pb-0 font-medium text-foreground">
						Workspace
					</DropdownMenuLabel>
					<p className="px-2 pb-1.5 text-[11px] text-muted-foreground">
						New items you create land here.
					</p>
					{rows.map(({ context, nested }) => {
						const Icon = WORKSPACE_ICON[context.kind];
						return (
							<DropdownMenuRadioItem
								key={contextKey(context)}
								value={contextKey(context)}
								className={nested ? "pl-6" : undefined}
							>
								<Icon className="text-muted-foreground" aria-hidden />
								<span className="truncate">{contextLabel(context)}</span>
							</DropdownMenuRadioItem>
						);
					})}
				</DropdownMenuRadioGroup>
				{personalOffNote && (
					<>
						<DropdownMenuSeparator />
						<p className="px-2 py-1.5 text-xs text-muted-foreground">
							{personalOffNote}
						</p>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
