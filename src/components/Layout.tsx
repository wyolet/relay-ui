import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "#/api/auth";
import { providersListQueryOptions } from "#/api/hooks/providers";
import { secretsListQueryOptions } from "#/api/hooks/secrets";
import { versionQueryOptions } from "#/api/queries/dashboard";
import type { Theme } from "#/lib/theme";
import { useTheme } from "#/lib/theme";
import { ToastContainer } from "./Toast";

interface NavItem {
	to: string;
	label: string;
}

const NAV_ITEMS: NavItem[] = [
	{ to: "/", label: "Dashboard" },
	{ to: "/providers", label: "Providers" },
	{ to: "/pools", label: "Pools" },
	{ to: "/secrets", label: "Secrets" },
	{ to: "/models", label: "Models" },
	{ to: "/routes", label: "Routes" },
	{ to: "/ratelimits", label: "Rate Limits" },
	{ to: "/attachments", label: "Attachments" },
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
		<div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
			{/* Sidebar */}
			<nav className="w-56 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col shrink-0">
				<div className="h-14 flex items-center px-4 border-b border-gray-200 dark:border-zinc-800">
					<span className="text-sm font-semibold text-gray-800 dark:text-zinc-100 truncate">
						Wyolet Relay
					</span>
				</div>
				<ul className="flex-1 py-2 space-y-0.5 px-2">
					{NAV_ITEMS.map((item) => {
						const isActive =
							item.to === "/"
								? currentPath === "/"
								: currentPath.startsWith(item.to);
						return (
							<li key={item.to}>
								<Link
									to={item.to}
									className={[
										"block px-3 py-2 rounded-md text-sm transition-colors",
										isActive
											? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
											: "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800",
									].join(" ")}
									activeProps={{
										className:
											"bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium block px-3 py-2 rounded-md text-sm transition-colors",
									}}
									inactiveProps={{
										className:
											"text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 block px-3 py-2 rounded-md text-sm transition-colors",
									}}
								>
									{item.label}
								</Link>
							</li>
						);
					})}
					{showBootstrap && (
						<li key="/bootstrap">
							<Link
								to="/bootstrap"
								className="block px-3 py-2 rounded-md text-sm transition-colors text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
								activeProps={{
									className:
										"bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium block px-3 py-2 rounded-md text-sm transition-colors",
								}}
								inactiveProps={{
									className:
										"text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 block px-3 py-2 rounded-md text-sm transition-colors",
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
				<header className="h-14 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0">
					<span className="text-base font-semibold text-gray-900 dark:text-zinc-100">
						Wyolet Relay
					</span>
					<div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
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
							className="p-1.5 rounded-md text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
						>
							<ThemeIcon theme={theme} />
						</button>
						<button
							type="button"
							onClick={() => void logout()}
							className="text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 font-medium transition-colors"
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
