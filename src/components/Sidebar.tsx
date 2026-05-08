import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	BarChart3,
	Boxes,
	Cog,
	KeyRound,
	LayoutDashboard,
	LogOut,
	Monitor,
	Moon,
	Shuffle,
	Sun,
} from "lucide-react";
import type { ComponentType } from "react";
import { useAuth } from "#/api/auth";
import { versionQueryOptions } from "#/api/queries/dashboard";
import { useSidebarStore } from "#/stores/sidebar";
import { type Theme, useTheme } from "#/stores/theme";

interface NavItem {
	to: "/" | "/usage" | "/logs" | "/models" | "/routers" | "/keys" | "/settings";
	label: string;
	icon: ComponentType<{ className?: string }>;
	prefix: string;
}

const NAV_ITEMS: NavItem[] = [
	{ to: "/", label: "Overview", icon: LayoutDashboard, prefix: "/" },
	{ to: "/usage", label: "Usage", icon: BarChart3, prefix: "/usage" },
	{ to: "/logs", label: "Logs", icon: Activity, prefix: "/logs" },
	{ to: "/models", label: "Models", icon: Boxes, prefix: "/models" },
	{ to: "/routers", label: "Routers", icon: Shuffle, prefix: "/routers" },
	{ to: "/keys", label: "Keys", icon: KeyRound, prefix: "/keys" },
	{ to: "/settings", label: "Settings", icon: Cog, prefix: "/settings" },
];

// Settings hub owns these legacy resource paths — keep Settings highlighted.
const SETTINGS_PATHS = [
	"/providers",
	"/pools",
	"/secrets",
	"/routes",
	"/ratelimits",
	"/attachments",
];

function BrandMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<title>Wyolet</title>
			<path
				d="M4 26 L12 6 L16 16 L20 6 L28 26"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function isActive(path: string, item: NavItem): boolean {
	if (item.to === "/") return path === "/";
	if (item.to === "/settings") {
		if (SETTINGS_PATHS.some((p) => path.startsWith(p))) return true;
	}
	return path.startsWith(item.prefix);
}

interface NavLinkProps {
	item: NavItem;
	collapsed: boolean;
	active: boolean;
}

function NavLink({ item, collapsed, active }: NavLinkProps) {
	const Icon = item.icon;
	return (
		<li>
			<Link
				to={item.to}
				aria-current={active ? "page" : undefined}
				title={collapsed ? item.label : undefined}
				className={[
					"group relative flex items-center gap-3 rounded-md text-sm transition-colors",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
					collapsed ? "h-9 w-9 justify-center mx-auto" : "h-9 px-2.5",
					active
						? "text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 font-medium"
						: "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
				].join(" ")}
			>
				<span
					aria-hidden="true"
					className={[
						"absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-brand-600 dark:bg-brand-400 transition-opacity",
						active ? "opacity-100" : "opacity-0",
						collapsed ? "hidden" : "",
					].join(" ")}
				/>
				<Icon className="w-4 h-4 shrink-0" />
				{!collapsed && <span className="truncate">{item.label}</span>}
			</Link>
		</li>
	);
}

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];
function nextTheme(t: Theme): Theme {
	return THEME_CYCLE[(THEME_CYCLE.indexOf(t) + 1) % THEME_CYCLE.length] ?? "system";
}
interface FooterButtonProps {
	onClick: () => void;
	icon: ComponentType<{ className?: string }>;
	label: string;
	collapsed: boolean;
}

function FooterButton({
	onClick,
	icon: Icon,
	label,
	collapsed,
}: FooterButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={collapsed ? label : undefined}
			aria-label={label}
			className={[
				"group flex items-center gap-3 rounded-md text-sm transition-colors",
				"text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100",
				"hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
				collapsed ? "h-9 w-9 justify-center mx-auto" : "h-9 px-2.5 w-full",
			].join(" ")}
		>
			<Icon className="w-4 h-4 shrink-0" />
			{!collapsed && <span className="truncate">{label}</span>}
		</button>
	);
}

export function Sidebar() {
	const collapsed = useSidebarStore((s) => s.collapsed);
	const { theme, setTheme } = useTheme();
	const { logout } = useAuth();
	const { data: versionData } = useQuery(versionQueryOptions);
	const path = useRouterState({ select: (s) => s.location.pathname });

	return (
		<nav
			aria-label="Main"
			data-collapsed={collapsed || undefined}
			className={[
				"shrink-0 flex flex-col bg-white dark:bg-neutral-900",
				"border-r border-neutral-200 dark:border-neutral-800",
				"transition-[width] duration-200 ease-out",
				collapsed ? "w-14" : "w-56",
			].join(" ")}
		>
			<div
				className={[
					"h-14 flex items-center border-b border-neutral-200 dark:border-neutral-800 shrink-0",
					collapsed ? "justify-center px-0" : "px-3 gap-2",
				].join(" ")}
			>
				<BrandMark className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
				{!collapsed && (
					<div className="flex items-baseline gap-1.5 overflow-hidden">
						<span className="text-[11px] font-medium tracking-[0.18em] text-neutral-400 dark:text-neutral-500 uppercase truncate">
							Wyolet
						</span>
						<span className="text-[11px] font-semibold tracking-[0.18em] text-neutral-900 dark:text-neutral-100 uppercase truncate">
							Relay
						</span>
					</div>
				)}
			</div>

			<ul
				className={[
					"flex-1 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden",
					collapsed ? "px-2" : "px-2",
				].join(" ")}
			>
				{NAV_ITEMS.map((item) => (
					<NavLink
						key={item.to}
						item={item}
						collapsed={collapsed}
						active={isActive(path, item)}
					/>
				))}
			</ul>

			<div
				className={[
					"border-t border-neutral-200 dark:border-neutral-800 py-2 space-y-0.5",
					collapsed ? "px-2" : "px-2",
				].join(" ")}
			>
				<FooterButton
					onClick={() => setTheme(nextTheme(theme))}
					icon={
						theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
					}
					label={`Theme: ${theme}`}
					collapsed={collapsed}
				/>
				<FooterButton
					onClick={() => void logout()}
					icon={LogOut}
					label="Sign out"
					collapsed={collapsed}
				/>
			</div>

			{!collapsed && versionData && (
				<div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums flex items-center justify-between">
					<span>backend</span>
					<span className="font-mono">{versionData.version}</span>
				</div>
			)}
		</nav>
	);
}

