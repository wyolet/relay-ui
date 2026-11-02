import type { Host } from "@/api/types/host";
import { useMutability } from "@/hooks/useMutability";

/** What the host detail header shows: state badges, allowed actions, and the
 * external links the host has set. */
export function useHostHeader(host: Host) {
	const { canEdit, canDelete } = useMutability(host.metadata, "host");
	const links: { href: string | undefined; label: string }[] = [
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
		links: links.filter((l) => l.href),
	};
}
