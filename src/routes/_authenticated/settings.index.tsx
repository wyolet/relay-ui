import { createFileRoute, Link } from "@tanstack/react-router";
import { Forward, Gauge, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/")({
	component: SettingsPage,
});

interface SettingItem {
	to: "/ratelimits" | "/settings/proxy-mode";
	label: string;
	description: string;
	icon: LucideIcon;
}

const ITEMS: SettingItem[] = [
	{
		to: "/settings/proxy-mode",
		label: "Proxy mode",
		description:
			"Accept BYO-credential requests for tracking and schema bridging.",
		icon: Forward,
	},
	{
		to: "/ratelimits",
		label: "Rate limits",
		description:
			"System-wide throttling rules. Attach them to policies or let providers auto-mirror upstream tiers.",
		icon: Gauge,
	},
];

function SettingsPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
			<p className="text-sm text-muted-foreground mb-8">
				Relay-wide behavior — passthrough, rate limits, and other operator
				knobs.
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{ITEMS.map((item) => {
					const Icon = item.icon;
					return (
						<Link
							key={item.to}
							to={item.to}
							className="group rounded-lg border border-border bg-card p-4 hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
						>
							<div className="flex items-center gap-2 mb-2">
								<Icon className="w-4 h-4 text-muted-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
								<span className="text-sm font-semibold text-foreground">
									{item.label}
								</span>
							</div>
							<p className="text-xs text-muted-foreground leading-relaxed">
								{item.description}
							</p>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
