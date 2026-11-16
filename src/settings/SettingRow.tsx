import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { SettingsDetailRoute } from "@/settings/sections";
import { LineRow } from "@/shared/LineGrid";

const COLS =
	"grid-cols-[minmax(14rem,1.5fr)_minmax(10rem,1fr)_minmax(7rem,auto)]";

/** One setting: what it is, where it stands now, and the way to change it. */
export function SettingRow({
	label,
	hint,
	state,
	control,
}: {
	label: string;
	hint: string;
	/** The current value in words: undefined while unknown or unreadable
	 * (a dash), null for a row that has none. */
	state?: ReactNode;
	control?: ReactNode;
}) {
	return (
		<LineRow cols={COLS}>
			<span className="grid min-w-0 gap-0.5 py-1">
				<span className="text-foreground">{label}</span>
				<span className="text-foot text-ink-3">{hint}</span>
			</span>
			<span className="min-w-0 truncate text-ink-2">
				{state === undefined ? <span className="text-ink-3">—</span> : state}
			</span>
			<span className="flex justify-end">{control}</span>
		</LineRow>
	);
}

/** The row's way into its fuller form. */
export function SettingLink({
	to,
	children = "Edit",
}: {
	to: SettingsDetailRoute;
	children?: string;
}) {
	return (
		<Link
			to={to}
			className="text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			{children} →
		</Link>
	);
}
