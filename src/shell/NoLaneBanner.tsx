import { NO_LANE_MESSAGE } from "@/lib/personalAccount";
import { AlertBanner } from "@/shared/AlertBanner";
import { useContextSwitcher } from "@/shell/useContextSwitcher";

/** Tells a caller with no context to work in why, once, above every page. */
export function NoLaneBanner() {
	const { noContext, personalOffNote } = useContextSwitcher();
	if (!noContext) return null;
	return (
		<AlertBanner severity="info" title={NO_LANE_MESSAGE} className="mb-5">
			{personalOffNote}
		</AlertBanner>
	);
}
