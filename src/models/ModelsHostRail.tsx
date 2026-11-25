import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import type { ReactNode } from "react";
import { IN_USE } from "@/lib/modelsByHost";
import { cn } from "@/lib/utils";
import type { ModelsRailView } from "@/models/useModelsByHost";
import { MatrixHostLogo } from "@/pricing/PricingHostGrid";

/** The models page's host list: In use first, then each serving host. */
export function ModelsHostRail({
	rail,
	open,
}: {
	rail: ModelsRailView;
	/** The open pane: a host slug or In use. */
	open: string;
}) {
	return (
		<nav
			aria-label="Hosts"
			className="max-h-72 overflow-x-hidden overflow-y-auto xl:sticky xl:top-0 xl:max-h-[calc(100vh-8rem)]"
		>
			<ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
				<RailItem
					value={IN_USE}
					open={open === IN_USE}
					icon={<Activity className="size-4 text-ink-2" aria-hidden />}
					label="In use"
					count={rail.inUse}
					dim={rail.narrowing && rail.inUse === 0}
				/>
				{rail.hosts.map((r) => (
					<RailItem
						key={r.host.id}
						value={r.host.slug}
						open={open === r.host.slug}
						icon={<MatrixHostLogo host={r.host} size={18} />}
						label={r.host.label}
						count={r.count}
						dim={rail.narrowing && r.count === 0}
						active={(r.usage?.requests ?? 0) > 0}
					/>
				))}
			</ul>
		</nav>
	);
}

function RailItem({
	value,
	open,
	icon,
	label,
	count,
	dim,
	active = false,
}: {
	value: string;
	open: boolean;
	icon: ReactNode;
	label: string;
	/** Undefined while it loads. */
	count: number | undefined;
	dim: boolean;
	/** Had traffic in the last 7 days. */
	active?: boolean;
}) {
	return (
		<li>
			<Link
				to="/models"
				search={(prev) => ({ ...prev, host: value })}
				aria-current={open ? "true" : undefined}
				className={cn(
					"flex h-8 items-center gap-2.5 rounded-md px-2.5 transition-colors",
					open
						? "bg-primary/10 text-foreground"
						: "text-ink-2 hover:bg-muted/50 hover:text-foreground",
					dim && "opacity-50",
				)}
			>
				<span className="flex size-[18px] shrink-0 items-center justify-center">
					{icon}
				</span>
				<span className="min-w-0 flex-1 truncate text-label" title={label}>
					{label}
				</span>
				<span className="shrink-0 text-meta text-ink-3 tabular-nums">
					{count ?? "…"}
				</span>
				<span
					className={cn(
						"size-1.5 shrink-0 rounded-full",
						active ? "bg-primary" : "bg-transparent",
					)}
					title={active ? "Traffic in the last 7 days" : undefined}
				/>
			</Link>
		</li>
	);
}
