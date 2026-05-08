import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	BarChart3,
	Boxes,
	Cog,
	KeyRound,
	LayoutDashboard,
	Moon,
	Shuffle,
	Sun,
} from "lucide-react";
import { useAuth } from "#/api/auth";
import { providersListQueryOptions } from "#/api/hooks/providers";
import { secretsListQueryOptions } from "#/api/hooks/secrets";
import { versionQueryOptions } from "#/api/queries/dashboard";
import type { Theme } from "#/lib/theme";
import { useTheme } from "#/lib/theme";
import { ToastContainer } from "./Toast";

interface NavItem {
	to: "/" | "/usage" | "/logs" | "/models" | "/routers" | "/keys" | "/settings";
	label: string;
	icon: typeof LayoutDashboard;
	matchPrefix: string;
}

const NAV_ITEMS: NavItem[] = [
	{ to: "/", label: "Overview", icon: LayoutDashboard, matchPrefix: "/" },
	{ to: "/usage", label: "Usage", icon: BarChart3, matchPrefix: "/usage" },
	{ to: "/logs", label: "Logs", icon: Activity, matchPrefix: "/logs" },
	{ to: "/models", label: "Models", icon: Boxes, matchPrefix: "/models" },
	{ to: "/routers", label: "Routers", icon: Shuffle, matchPrefix: "/routers" },
	{ to: "/keys", label: "Keys", icon: KeyRound, matchPrefix: "/keys" },
	{ to: "/settings", label: "Settings", icon: Cog, matchPrefix: "/settings" },
];

// Settings hub owns these — paths under it stay highlighted on Settings.
const SETTINGS_PATHS = [
	"/providers",
	"/pools",
	"/secrets",
	"/routes",
	"/ratelimits",
	"/attachments",
];

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

function nextTheme(current: Theme): Theme {
	const idx = THEME_CYCLE.indexOf(current);
	return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length] ?? "system";
}

function ThemeIcon({ theme }: { theme: Theme }) {
	const prefersDark =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches;
	if (theme === "dark") return <Moon className="w-4 h-4" />;
	if (theme === "light") return <Sun className="w-4 h-4" />;
	// system
	return prefersDark ? (
		<Moon className="w-4 h-4" />
	) : (
		<Sun className="w-4 h-4" />
	);
}

function themeLabel(theme: Theme): string {
	if (theme === "light") return "Theme: light";
	if (theme === "dark") return "Theme: dark";
	const prefersDark =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches;
	return `Theme: system (${prefersDark ? "dark" : "light"})`;
}

function useIsBootstrapEmpty() {
	const { data: providers } = useQuery({
		...providersListQueryOptions,
		retry: false,
	});
	const { data: secrets } = useQuery({
		...secretsListQueryOptions,
		retry: false,
	});
	return (
		(providers?.items ?? []).length === 0 && (secrets?.items ?? []).length === 0
	);
}

export function Layout() {
	const { logout } = useAuth();
	const { data: versionData } = useQuery(versionQueryOptions);
	const showBootstrap = useIsBootstrapEmpty();
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
			{/* Sidebar */}
			<nav className="w-56 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0">
				<div className="h-14 flex items-center px-4 border-b border-neutral-200 dark:border-neutral-800">
					<span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
						Wyolet Relay
					</span>
				</div>
				<ul className="flex-1 py-2 space-y-0.5 px-2">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isSettings = item.to === "/settings";
						const inSettingsHub =
							isSettings &&
							SETTINGS_PATHS.some((p) => currentPath.startsWith(p));
						const isActive =
							item.to === "/"
								? currentPath === "/"
								: currentPath.startsWith(item.matchPrefix) || inSettingsHub;
						const cls = [
							"flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
							isActive
								? "bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-medium"
								: "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
						].join(" ");
						return (
							<li key={item.to}>
								<Link to={item.to} className={cls}>
									<Icon className="w-4 h-4 shrink-0" />
									<span>{item.label}</span>
								</Link>
							</li>
						);
					})}
					{showBootstrap && (
						<li key="/bootstrap">
							<Link
								to="/bootstrap"
								className="block px-3 py-2 rounded-md text-sm transition-colors text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
								activeProps={{
									className:
										"bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-medium block px-3 py-2 rounded-md text-sm transition-colors",
								}}
								inactiveProps={{
									className:
										"text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 block px-3 py-2 rounded-md text-sm transition-colors",
								}}
							>
								Bootstrap
							</Link>
						</li>
					)}
				</ul>
			</nav>

			{/* Main content */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Header */}
				<header className="h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6 shrink-0">
					<span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
						Wyolet Relay
					</span>
					<div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
						{versionData && (
							<span>
								backend <span className="font-mono">{versionData.version}</span>
							</span>
						)}
						<span>
							ui{" "}
							<span className="font-mono">
								{import.meta.env.VITE_UI_VERSION}
							</span>
						</span>
						<button
							type="button"
							title={themeLabel(theme)}
							aria-label={themeLabel(theme)}
							onClick={() => setTheme(nextTheme(theme))}
							className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
						>
							<ThemeIcon theme={theme} />
						</button>
						<button
							type="button"
							onClick={() => void logout()}
							className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium transition-colors"
						>
							Logout
						</button>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-auto p-6">
					<Outlet />
				</main>
				<ToastContainer />
			</div>
		</div>
	);
}
