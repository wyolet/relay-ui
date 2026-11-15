import { buttonVariants } from "@/components/ui/button";

// The toolbar's actions: the page's main action loud and first, secondary
// ones tonal beside it.

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
