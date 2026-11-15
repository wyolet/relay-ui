import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsNav } from "@/settings/SettingsNav";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsLayout,
});

function SettingsLayout() {
	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-10">
			<aside className="md:sticky md:top-5 md:self-start">
				<SettingsNav />
			</aside>
			<div className="min-w-0">
				<Outlet />
			</div>
		</div>
	);
}
