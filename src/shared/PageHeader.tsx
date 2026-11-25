import type { ReactNode } from "react";

/** The head of a list, form, settings or read page: an optional back link
 * over the title and description, with the page's actions on the right. */
export function PageHeader({
	back,
	title,
	description,
	actions,
}: {
	/** A `BackLink`. */
	back?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<header className="mb-6 flex flex-col gap-2">
			{back}
			<div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
				<div className="min-w-0">
					<h1 className="text-2xl font-bold text-foreground wrap-break-word">
						{title}
					</h1>
					{description && (
						<p className="mt-1 max-w-2xl text-label text-ink-2">
							{description}
						</p>
					)}
				</div>
				{actions && (
					<div className="flex min-h-8 flex-wrap items-center gap-2">
						{actions}
					</div>
				)}
			</div>
		</header>
	);
}
