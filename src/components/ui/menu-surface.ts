// One look for every floating list (Select, DropdownMenu, Popover). Compose these
// instead of restyling each primitive, so the three never drift apart.

// The floating panel: a visible edge and lift, so it reads apart from the page
// in both themes.
export const menuSurfaceClassName =
	"rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-border";

// A row: the same text size as the trigger that opened it.
export const menuItemClassName =
	"min-h-8 rounded-md px-2.5 py-1.5 text-sm";

// A group heading: small caps, so it never reads as a row you can pick.
export const menuLabelClassName =
	"px-2.5 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

export const menuSeparatorClassName = "-mx-1 my-1 h-px bg-border";
