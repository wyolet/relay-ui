import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			theme: "system",
			setTheme: (theme) => {
				set({ theme });
				applyTheme(theme);
			},
		}),
		{
			name: "theme",
			partialize: (s) => ({ theme: s.theme }),
		},
	),
);

export function applyTheme(theme: Theme): void {
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const useDark = theme === "dark" || (theme === "system" && prefersDark);
	document.documentElement.classList.toggle("dark", useDark);
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
	const theme = useThemeStore((s) => s.theme);
	const setTheme = useThemeStore((s) => s.setTheme);

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	useEffect(() => {
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handle = () => applyTheme("system");
		mq.addEventListener("change", handle);
		return () => mq.removeEventListener("change", handle);
	}, [theme]);

	return { theme, setTheme };
}
