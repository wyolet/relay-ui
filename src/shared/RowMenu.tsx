import { MoreHorizontal } from "lucide-react";
import type { ReactElement } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MenuAction {
	label: string;
	onClick?: () => void;
	/** Render the menu item as another element (e.g. a TanStack <Link>). */
	render?: ReactElement;
	danger?: boolean;
	disabled?: boolean;
}

/** The overflow (⋯) row-actions menu shared by index tables. */
export function RowMenu({ actions }: { actions: MenuAction[] }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Row actions"
				className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<MoreHorizontal className="w-3.5 h-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-[180px]">
				{actions.map((a) => (
					<DropdownMenuItem
						key={a.label}
						disabled={a.disabled}
						variant={a.danger ? "destructive" : "default"}
						onClick={a.onClick}
						render={a.render}
					>
						{a.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
