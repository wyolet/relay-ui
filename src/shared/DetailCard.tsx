import type { LucideIcon } from "lucide-react";

/** The titled card + definition row a detail page is built from. */
export function DetailCard({
	title,
	icon: Icon,
	action,
	children,
}: {
	title: string;
	icon: LucideIcon;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-md border border-border bg-card">
			<header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
				<div className="flex items-center gap-1.5">
					<Icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
					<h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						{title}
					</h2>
				</div>
				{action}
			</header>
			<div className="px-4 py-3">{children}</div>
		</section>
	);
}

export function DetailRow({
	label,
	children,
}: {
	label: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="py-3 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-[160px_1fr] sm:items-baseline gap-1 sm:gap-4">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="text-xs text-foreground min-w-0">
				{children}
			</dd>
		</div>
	);
}

/**
 * A value line mixing text, badges and buttons: they centre on one line, and the
 * row's label sits on that line's text baseline (DetailRow aligns baselines).
 */
export function DetailInline({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1">
			{children}
		</div>
	);
}

/** Empty-state line inside a detail card. */
export function DetailEmpty({ children }: { children: React.ReactNode }) {
	return <p className="text-xs text-muted-foreground">{children}</p>;
}
