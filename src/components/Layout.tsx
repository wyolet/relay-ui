import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "#/api/auth";
import {
	providersQueryOptions,
	secretsQueryOptions,
	versionQueryOptions,
} from "#/api/queries/dashboard";

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

function useIsBootstrapEmpty() {
	const { data: providers } = useQuery({
		...providersQueryOptions,
		retry: false,
	});
	const { data: secrets } = useQuery({ ...secretsQueryOptions, retry: false });
	return (
		(providers?.items.length ?? 1) === 0 && (secrets?.items.length ?? 1) === 0
	);
}

export function Layout() {
	const { logout } = useAuth();
	const { data: versionData } = useQuery(versionQueryOptions);
	const showBootstrap = useIsBootstrapEmpty();
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;

	return (
		<div className="flex min-h-screen bg-gray-50">
			{/* Sidebar */}
			<nav className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
				<div className="h-14 flex items-center px-4 border-b border-gray-200">
					<span className="text-sm font-semibold text-gray-800 truncate">
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
											? "bg-blue-50 text-blue-700 font-medium"
											: "text-gray-700 hover:bg-gray-100",
									].join(" ")}
									activeProps={{
										className:
											"bg-blue-50 text-blue-700 font-medium block px-3 py-2 rounded-md text-sm transition-colors",
									}}
									inactiveProps={{
										className:
											"text-gray-700 hover:bg-gray-100 block px-3 py-2 rounded-md text-sm transition-colors",
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
								className="block px-3 py-2 rounded-md text-sm transition-colors text-gray-700 hover:bg-gray-100"
								activeProps={{
									className:
										"bg-blue-50 text-blue-700 font-medium block px-3 py-2 rounded-md text-sm transition-colors",
								}}
								inactiveProps={{
									className:
										"text-gray-700 hover:bg-gray-100 block px-3 py-2 rounded-md text-sm transition-colors",
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
				<header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
					<span className="text-base font-semibold text-gray-900">
						Wyolet Relay
					</span>
					<div className="flex items-center gap-4 text-xs text-gray-500">
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
							onClick={() => void logout()}
							className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
						>
							Logout
						</button>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-auto p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
