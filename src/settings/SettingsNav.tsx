import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS, sectionForPath } from "@/settings/sections";

/** The settings sections, the current one marked. */
export function SettingsNav() {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const active = sectionForPath(path);
	return (
		<nav aria-label="Settings sections" className="flex gap-1 md:flex-col">
			{SETTINGS_SECTIONS.map((s) => (
				<Link
					key={s.id}
					to="/settings/$section"
					params={{ section: s.id }}
					aria-current={active === s.id ? "page" : undefined}
					className={cn(
						"rounded-md px-2.5 py-1.5 text-sm transition-colors",
						active === s.id
							? "bg-muted font-medium text-foreground"
							: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
					)}
				>
					{s.label}
				</Link>
			))}
		</nav>
	);
}
