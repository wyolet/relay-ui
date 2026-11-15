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
import { cn } from "@/lib/utils";
import { contextKey, contextLabel, contextRowDetail } from "@/lib/workContext";
import { useSlidingHighlight } from "@/shared/useSlidingHighlight";
import { WorkspaceAvatar } from "@/shared/WorkspaceAvatar";

interface WorkspaceMenuProps {
	/** The element the menu opens from, rendered with `children` inside. */
	trigger: ReactElement;
	children: ReactNode;
	"aria-label"?: string;
	align?: "start" | "center" | "end";
	/** A form's own pick: the menu sets it instead of the workspace. */
	formPick?: { value: string; onSelect: (key: string) => void };
}

/** Picks the workspace new rows land in; the sidebar switcher and create forms open it. */
export function WorkspaceMenu({
	trigger,
	children,
	"aria-label": ariaLabel,
	align = "start",
	formPick,
}: WorkspaceMenuProps) {
	const {
		rows,
		allRows,
		currentKey,
		selectKey,
		onOpenChange,
		personalOffNote,
	} = useContextSwitcher();
	const value = formPick?.value ?? currentKey;
	const onSelect = formPick?.onSelect ?? selectKey;
	const slide = useSlidingHighlight();

	return (
		<DropdownMenu onOpenChange={onOpenChange}>
			<DropdownMenuTrigger render={trigger} aria-label={ariaLabel}>
				{children}
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align} sideOffset={6} className="w-72">
				<DropdownMenuRadioGroup value={value} onValueChange={onSelect}>
					{formPick ? (
						<>
							<DropdownMenuLabel className="pb-0 font-medium text-foreground">
								Create in
							</DropdownMenuLabel>
							<p className="px-2 pb-1.5 text-[11px] text-muted-foreground">
								Only this form; your workspace stays as it is.
							</p>
						</>
					) : (
						<DropdownMenuLabel>Accounts</DropdownMenuLabel>
					)}
					<div className="relative" {...slide.listProps}>
						<span
							aria-hidden
							className="pointer-events-none absolute inset-x-0 rounded-md bg-popover-hover duration-150 ease-out"
							style={slide.style}
						/>
						{(formPick ? allRows : rows).map(({ context, nested }) => (
							<DropdownMenuRadioItem
								key={contextKey(context)}
								value={contextKey(context)}
								{...slide.rowProps}
								// The glide above paints the highlight; the row keeps its own clear.
								className={cn("gap-2.5 focus:bg-transparent", nested && "pl-6")}
							>
								<WorkspaceAvatar context={context} size="sm" />
								<span className="grid min-w-0 leading-tight">
									<span className="truncate">{contextLabel(context)}</span>
									<span className="truncate text-[11px] text-muted-foreground">
										{contextRowDetail(context)}
									</span>
								</span>
							</DropdownMenuRadioItem>
						))}
					</div>
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
