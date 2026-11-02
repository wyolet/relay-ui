import type { ReactNode } from "react";

/** The small muted tag beside an account's name. */
export function AccountTag({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<span
			className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border whitespace-nowrap"
			title={title}
		>
			{children}
		</span>
	);
}
