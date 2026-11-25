import { createLink } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { AnchorHTMLAttributes, Ref } from "react";

function BackAnchor({
	children,
	ref,
	...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
	ref?: Ref<HTMLAnchorElement>;
}) {
	return (
		<a
			ref={ref}
			{...props}
			className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
		>
			<ChevronLeft className="size-3.5" aria-hidden />
			{children}
		</a>
	);
}

/** The chevron link up to the page this one sits under; takes typed `Link` props. */
export const BackLink = createLink(BackAnchor);
