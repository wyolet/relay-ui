import { Outlet } from "@tanstack/react-router";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { ToastContainer } from "@/shared/Toast";
import { useSidebarStore } from "@/stores/sidebar";
import { AccountMenu } from "./AccountMenu";
import { Sidebar } from "./Sidebar";

export function Layout() {
	const collapsed = useSidebarStore((s) => s.collapsed);
	const setCollapsed = useSidebarStore((s) => s.set);

	return (
		<SidebarProvider
			open={!collapsed}
			onOpenChange={(open) => setCollapsed(!open)}
			className="h-screen overflow-hidden"
		>
			<Sidebar />
			<SidebarInset className="min-w-0 overflow-hidden">
				<header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/60 px-2 backdrop-blur-sm">
					<SidebarTrigger />
					<AccountMenu />
				</header>
				<main className="min-h-0 flex-1 overflow-auto">
					<div className="mx-auto max-w-7xl px-6 py-5">
						<Outlet />
					</div>
				</main>
			</SidebarInset>
			<ToastContainer />
		</SidebarProvider>
	);
}
