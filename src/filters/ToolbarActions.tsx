import { buttonVariants } from "@/components/ui/button";

// The toolbar's actions read as one split button: the page's main action
// loud on the left, secondary ones tonal beside it.

/** The page's one main action: put it on its <Link> or <button>. */
export const toolbarMainActionClassName = buttonVariants({
	variant: "cta",
	size: "lg",
});

/** A secondary action beside the main one. */
export const toolbarActionClassName = buttonVariants({
	variant: "default",
	size: "lg",
});
