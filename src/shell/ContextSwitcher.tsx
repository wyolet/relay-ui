import {
	Boxes,
	ChevronsUpDown,
	type LucideIcon,
	Server,
	UserRound,
	Users,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { contextKey, contextLabel, type WorkContext } from "@/lib/workContext";
import { headerTriggerClass } from "@/shell/headerTrigger";
import { useContextSwitcher } from "@/shell/useContextSwitcher";

const KIND_ICON: Record<WorkContext["kind"], LucideIcon> = {
	personal: UserRound,
	system: Server,
	team: Users,
	project: Boxes,
};

/** Picks the context new rows land in; hidden until the caller's contexts load, a plain label when there are none. */
export function ContextSwitcher() {
	const { rows, current, currentKey, selectKey, personalOffNote, noContext } =
		useContextSwitcher();
	if (noContext) {
		return (
			<span className="px-2 text-xs text-muted-foreground">No account</span>
		);
	}
	if (!current) return null;
	const CurrentIcon = KIND_ICON[current.kind];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={headerTriggerClass}
				aria-label={`Working in ${contextLabel(current)}`}
			>
				<CurrentIcon
					className="ml-1 size-3.5 text-muted-foreground"
					aria-hidden
				/>
				<span className="max-w-40 truncate">{contextLabel(current)}</span>
				<ChevronsUpDown className="size-3.5 text-muted-foreground" />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" sideOffset={6} className="w-60">
				<DropdownMenuRadioGroup value={currentKey} onValueChange={selectKey}>
					<DropdownMenuLabel>New items go to</DropdownMenuLabel>
					{rows.map(({ context, nested }) => {
						const Icon = KIND_ICON[context.kind];
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
