import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, KeyRound, Network, Paperclip, Plug, Timer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
});

interface SettingItem {
	to:
		| "/providers"
		| "/pools"
		| "/secrets"
		| "/routes"
		| "/ratelimits"
		| "/attachments";
	label: string;
	description: string;
	icon: typeof Plug;
}

const ITEMS: SettingItem[] = [
	{
		to: "/providers",
		label: "Providers",
		description:
			"Upstream LLM vendors (OpenAI, Anthropic, …) and their base URLs.",
		icon: Plug,
	},
	{
		to: "/pools",
		label: "Pools",
		description:
			"Groupings of upstream credentials with passthrough or BYOK behavior.",
		icon: Boxes,
	},
	{
		to: "/secrets",
		label: "Secrets",
		description: "Provider credentials referenced by pools.",
		icon: KeyRound,
	},
	{
		to: "/routes",
		label: "Routes",
		description: "Match incoming requests to a model or routing strategy.",
		icon: Network,
	},
	{
		to: "/ratelimits",
		label: "Rate Limits",
		description: "Named limit rules attachable to models, pools, or keys.",
		icon: Timer,
	},
	{
		to: "/attachments",
		label: "Attachments",
		description:
			"Audit view of every rate-limit attachment across the catalog.",
		icon: Paperclip,
	},
];

function SettingsPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-foreground mb-2">
				Settings
			</h1>
			<p className="text-sm text-muted-foreground mb-8">
				Change the wiring. Power-user configuration for providers, pools,
				secrets, routes, and rate limits.
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
