import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's stock sizes, so it read the theme's
// `text-meta` / `text-label` as colours and dropped them next to a colour
// like `text-ink-3`. The names mirror the `--text-*` sizes in globals.css.
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			text: [
				"title",
				"figure",
				"mini-figure",
				"lede",
				"section",
				"body",
				"tab",
				"label",
				"meta",
				"foot",
			],
		},
	},
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
