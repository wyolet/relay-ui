import { Boxes } from "lucide-react";
import type { ReactNode } from "react";

/** Explains that models come from the catalog, on routes that once created or edited them. */
export function ModelsSyncedNotice({
	title,
	children,
	action,
}: {
	title: string;
	children: ReactNode;
	action: ReactNode;
}) {
	return (
		<div className="mx-auto mt-10 max-w-lg rounded-xl border border-border bg-card p-8 text-center">
			<Boxes
				className="mx-auto mb-3 size-7 text-muted-foreground/60"
				aria-hidden
			/>
			<h1 className="text-lg font-semibold text-foreground">{title}</h1>
			<p className="mx-auto mt-2 mb-6 max-w-sm text-sm text-muted-foreground">
				{children}
			</p>
			{action}
		</div>
	);
}
