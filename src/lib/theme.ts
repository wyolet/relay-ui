// Re-export under the old path so existing imports keep working.
// New code should import from #/stores/theme directly.
export type { Theme } from "#/stores/theme";
export { applyTheme, useTheme, useThemeStore } from "#/stores/theme";
