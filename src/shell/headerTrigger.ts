import { cn } from "@/lib/utils";

/** The quiet menu trigger the app header's menus share. */
export const headerTriggerClass = cn(
	"flex h-8 items-center gap-2 rounded-md pl-1 pr-1.5 text-sm transition-colors",
	"text-foreground hover:bg-muted",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);
