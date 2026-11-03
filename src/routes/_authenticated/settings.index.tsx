import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BadgeCheck,
	Forward,
	Gauge,
	History,
	KeyRound,
	LogIn,
	type LucideIcon,
	Network,
	ScrollText,
	ShieldCheck,
	UserRound,
} from "lucide-react";
import { type Capability, useCapabilities } from "@/api/hooks/capabilities";

export const Route = createFileRoute("/_authenticated/settings/")({
	component: SettingsPage,
});

interface SettingItem {
	to:
		| "/settings/accounts"
		| "/settings/rate-limits"
		| "/settings/proxy-mode"
		| "/settings/payload-logging"
		| "/settings/permissions"
		| "/settings/sso"
		| "/settings/scim"
		| "/settings/tokens"
		| "/settings/license"
		| "/audit";
	label: string;
	description: string;
	icon: LucideIcon;
	/** Shown only to callers who may list it. */
	capability?: Capability;
}

const ITEMS: SettingItem[] = [
	{
		to: "/settings/accounts",
		label: "Accounts",
		description:
			"Whether users get a personal account. Groups and single users can override it.",
		icon: UserRound,
	},
	{
		to: "/settings/proxy-mode",
		label: "Proxy mode",
		description:
			"Accept BYO-credential requests for tracking and schema bridging.",
		icon: Forward,
	},
	{
		to: "/settings/payload-logging",
		label: "Payload logging",
		description:
			"Global default for capturing request/response bodies. Overrides per-policy and per-key toggles.",
		icon: ScrollText,
	},
	{
		to: "/settings/rate-limits",
		label: "Rate limits",
		description:
			"Throttling for Relay's control and inference APIs. Configure RPS / RPM / RPH / RPD caps.",
		icon: Gauge,
	},
	{
		to: "/settings/sso",
		label: "SSO",
		description:
			"Sign operators in through your identity provider (OIDC); password login always works.",
		icon: LogIn,
	},
	{
		to: "/settings/scim",
		label: "SCIM provisioning",
		description:
			"Let an identity provider (Entra ID, Okta) provision users and groups through SCIM 2.0.",
		icon: Network,
	},
	{
		to: "/settings/tokens",
		label: "Inference tokens",
		description:
			"Turn inference tokens on or off, set their lifetimes, and rotate the signing key.",
		icon: KeyRound,
	},
	{
		to: "/settings/license",
		label: "License",
		description:
			"Install or review the license file that unlocks custom roles.",
		icon: BadgeCheck,
	},
	{
		to: "/audit",
		label: "Audit log",
		description:
			"Who changed what and when: every write to Relay's configuration, with its actor and fields.",
		icon: History,
		capability: "audit",
	},
	{
		to: "/settings/permissions",
		label: "Edit permissions",
		description:
			"Unlock editing of server-managed resources (synced models/providers/hosts, host-owned policies).",
		icon: ShieldCheck,
	},
];

function SettingsPage() {
	const capabilities = useCapabilities();
	const items = ITEMS.filter(
		(item) => !item.capability || capabilities[item.capability],
	);
	return (
		<div>
			<h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
			<p className="text-sm text-muted-foreground mb-8">
				Relay-wide behavior — proxy mode, rate limits, and other operator knobs.
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{items.map((item) => {
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
