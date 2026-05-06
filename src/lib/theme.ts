import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

function isTheme(val: unknown): val is Theme {
	return val === "light" || val === "dark" || val === "system";
}

export function getStoredTheme(): Theme {
	const raw = localStorage.getItem("theme");
	return isTheme(raw) ? raw : "system";
}

export function applyTheme(theme: Theme): void {
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const useDark = theme === "dark" || (theme === "system" && prefersDark);

	if (useDark) {
		document.documentElement.classList.add("dark");
	} else {
		document.documentElement.classList.remove("dark");
	}

	localStorage.setItem("theme", theme);
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
	const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

	// Apply theme on mount and whenever theme changes
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Listen to system preference changes when theme === 'system'
	useEffect(() => {
		if (theme !== "system") return;

		const mq = window.matchMedia("(prefers-color-scheme: dark)");

		function handleChange() {
			// Re-apply the current 'system' theme to pick up new OS preference
			applyTheme("system");
		}

		mq.addEventListener("change", handleChange);
		return () => {
			mq.removeEventListener("change", handleChange);
		};
	}, [theme]);

	function setTheme(t: Theme) {
		setThemeState(t);
	}

	return { theme, setTheme };
}
