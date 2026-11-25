import { Outlet } from "@tanstack/react-router";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { ToastContainer } from "@/shared/Toast";
import { useSidebarStore } from "@/stores/sidebar";
import { useWorkContextStore } from "@/stores/workContext";
import { NoLaneBanner } from "./NoLaneBanner";
import { Sidebar } from "./Sidebar";
import { WorkspaceCrumb } from "./WorkspaceCrumb";

export function Layout() {
	const collapsed = useSidebarStore((s) => s.collapsed);
	const setCollapsed = useSidebarStore((s) => s.set);
	const switches = useWorkContextStore((s) => s.switches);

	return (
		<SidebarProvider
			open={!collapsed}
			onOpenChange={(open) => setCollapsed(!open)}
			className="h-screen overflow-hidden"
		>
			<Sidebar />
			<SidebarInset className="min-w-0 overflow-hidden">
				<header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/60 px-2 backdrop-blur-sm">
					<div className="flex min-w-0 items-center gap-1">
						<SidebarTrigger />
						<WorkspaceCrumb />
					</div>
				</header>
				<div
					data-scroll-restoration-id="page"
					className="min-h-0 flex-1 overflow-auto"
				>
					<div
						key={switches}
						className="mx-auto max-w-[90rem] animate-in fade-in-0 px-6 pt-5 pb-40 duration-300"
					>
						<NoLaneBanner />
						<Outlet />
					</div>
				</div>
			</SidebarInset>
			<ToastContainer />
		</SidebarProvider>
	);
}
