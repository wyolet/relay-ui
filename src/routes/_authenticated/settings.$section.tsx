import { createFileRoute, redirect } from "@tanstack/react-router";
import { SECTION_VIEWS } from "@/settings/SettingsSections";
import { isSettingsSection, SETTINGS_SECTIONS } from "@/settings/sections";
import { PageHeader } from "@/shared/PageHeader";

export const Route = createFileRoute("/_authenticated/settings/$section")({
	beforeLoad: ({ params }) => {
		if (!isSettingsSection(params.section)) {
			throw redirect({
				to: "/settings/$section",
				params: { section: "access" },
			});
		}
	},
	component: SettingsSectionPage,
});

function SettingsSectionPage() {
	const { section } = Route.useParams();
	const meta = SETTINGS_SECTIONS.find((s) => s.id === section);
	if (!meta) return null;
	const View = SECTION_VIEWS[meta.id];
	return (
		<div>
			<PageHeader title={meta.label} description={meta.lede} />
			<View />
		</div>
	);
}
