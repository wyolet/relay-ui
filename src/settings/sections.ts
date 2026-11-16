export const SETTINGS_SECTIONS = [
	{
		id: "access",
		label: "Access",
		lede: "Who gets in and what they sign in with.",
	},
	{
		id: "traffic",
		label: "Traffic",
		lede: "What the relay accepts and how fast.",
	},
	{
		id: "data",
		label: "Data",
		lede: "What the relay keeps from each request.",
	},
	{
		id: "governance",
		label: "Governance",
		lede: "How far operators may change rows the catalog manages. The relay enforces it.",
	},
	{
		id: "system",
		label: "System",
		lede: "This deployment: license and versions.",
	},
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function isSettingsSection(v: string): v is SettingsSectionId {
	return SETTINGS_SECTIONS.some((s) => s.id === v);
}

/** The pages a setting's row opens for the fuller form. */
export type SettingsDetailRoute =
	| "/settings/sso"
	| "/settings/scim"
	| "/settings/tokens"
	| "/settings/rate-limits"
	| "/settings/payload-logging"
	| "/settings/license"
	| "/audit";

const DETAIL_SECTION: Record<string, SettingsSectionId> = {
	"/settings/accounts": "access",
	"/settings/sso": "access",
	"/settings/scim": "access",
	"/settings/tokens": "access",
	"/settings/proxy-mode": "traffic",
	"/settings/rate-limits": "traffic",
	"/settings/payload-logging": "data",
	"/settings/license": "system",
};

/** The section a settings path sits under: its own, or its detail page's. */
export function sectionForPath(path: string): SettingsSectionId | undefined {
	const own = path.match(/^\/settings\/([^/]+)/)?.[1];
	if (own && isSettingsSection(own)) return own;
	return DETAIL_SECTION[path];
}
