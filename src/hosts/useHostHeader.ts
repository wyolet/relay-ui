import type { Host } from "@/api/types/host";
import { useMutability } from "@/hooks/useMutability";
import type { HeaderLink } from "@/shared/DetailPageHeader";

/** What the host detail header shows: state badges, allowed actions, and the
 * external links the host has set. */
export function useHostHeader(host: Host) {
	const { canEdit, canDelete } = useMutability(host.metadata, "host");
	const links: HeaderLink[] = [
		{ href: host.spec.consoleURL, label: "Console" },
		{ href: host.spec.docsURL, label: "Docs" },
		{ href: host.spec.homepageURL, label: "Homepage" },
		{ href: host.spec.statusPageURL, label: "Status" },
	];
	return {
		enabled: host.spec.enabled !== false,
		system: host.metadata.owner?.kind === "system",
		canEdit,
		canDelete,
		links,
	};
}
