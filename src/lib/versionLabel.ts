/** A build version as people read it: an untagged local build says so. */
export function versionLabel(version: string | undefined): string {
	const v = version?.trim();
	if (!v) return "unknown";
	return v === "dev" ? "development build" : v;
}
