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
		<div className="py-3 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="text-xs text-foreground min-w-0">{children}</dd>
		</div>
	);
}

/** Empty-state line inside a detail card. */
export function DetailEmpty({ children }: { children: React.ReactNode }) {
	return <p className="text-xs text-muted-foreground">{children}</p>;
}
