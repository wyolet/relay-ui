import { useQuery } from "@tanstack/react-query";
import { useCapabilities } from "@/api/hooks/capabilities";
import type { LicenseInfo } from "@/api/hooks/license";
import { licenseQueryOptions } from "@/api/hooks/license";
import { versionQueryOptions } from "@/api/queries/dashboard";
import { fmtDate } from "@/lib/format";
import { versionLabel } from "@/lib/versionLabel";

/** The license in a phrase, both versions, and whether the audit log is yours to read. */
export function useSystemSettings() {
	const license = useQuery(licenseQueryOptions);
	const version = useQuery(versionQueryOptions);
	const capabilities = useCapabilities();
	const info = license.data;
	return {
		license: info ? licenseText(info) : undefined,
		relayVersion: version.data ? versionLabel(version.data.version) : undefined,
		uiVersion: versionLabel(import.meta.env.VITE_UI_VERSION),
		canReadAudit: capabilities.audit,
	};
}

function licenseText(info: LicenseInfo): string {
	if (!info.licensed) return "Community";
	const until = info.expiresAt ? `, until ${fmtDate(info.expiresAt)}` : "";
	return `${info.customer ?? "Licensed"}${until}${info.grace ? " (in grace)" : ""}`;
}
