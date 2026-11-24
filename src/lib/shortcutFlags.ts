/** Runtime flags (`/config.json` `features`) gating the shortcut forms; absent = off. */
export const SHORTCUT_FLAGS = {
	access: "shortcutAccess",
	limit: "shortcutLimit",
	removeAgent: "shortcutRemoveAgent",
} as const;
