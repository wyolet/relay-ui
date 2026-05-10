import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Forward,
	KeyRound,
	type LucideIcon,
	Network,
	Paperclip,
	Plug,
	ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/")({
	component: SettingsPage,
});

interface SettingItem {
	to:
		| "/providers"
		| "/secrets"
		| "/routes"
		| "/policies"
		| "/attachments"
		| "/settings/passthrough";
	label: string;
	description: string;
	icon: LucideIcon;
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
		to: "/policies",
		label: "Policies",
		description:
			"Bundles of upstream credentials, allowed models, and rate limits attached to relay keys.",
		icon: ShieldCheck,
	},
	{
		to: "/secrets",
		label: "Secrets",
		description: "Provider credentials referenced by policies.",
		icon: KeyRound,
	},
	{
		to: "/routes",
		label: "Routes",
		description: "Match incoming requests to a model or routing strategy.",
		icon: Network,
	},
	{
		to: "/settings/passthrough",
		label: "Passthrough",
		description:
			"Accept BYO-credential requests for tracking and schema bridging.",
		icon: Forward,
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
			<h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
			<p className="text-sm text-muted-foreground mb-8">
				Wiring and behavior. Power-user configuration for providers, policies,
				secrets, routes, and passthrough.
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
