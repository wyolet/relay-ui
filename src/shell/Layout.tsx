import { Outlet } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ToastContainer } from "@/shared/Toast";
import { useSidebarStore } from "@/stores/sidebar";
import { Sidebar } from "./Sidebar";

function Header() {
	const collapsed = useSidebarStore((s) => s.collapsed);
	const toggle = useSidebarStore((s) => s.toggle);

	return (
		<header className="h-12 shrink-0 flex items-center px-2 border-b border-border bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm">
			<button
				type="button"
				onClick={toggle}
				aria-expanded={!collapsed}
				aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
			>
				{collapsed ? (
					<PanelLeftOpen className="w-4 h-4" />
				) : (
					<PanelLeftClose className="w-4 h-4" />
				)}
			</button>
		</header>
	);
}

export function Layout() {
	return (
		<div className="flex h-screen overflow-hidden bg-muted/30">
			<Sidebar />
			<div className="flex-1 min-w-0 flex flex-col h-screen">
				<Header />
				<main className="flex-1 overflow-auto min-h-0">
					<div className="mx-auto max-w-7xl px-6 py-5">
						<Outlet />
					</div>
				</main>
			</div>
			<ToastContainer />
		</div>
	);
}
