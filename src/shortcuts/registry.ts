import type { ComponentType } from "react";
import { CopyAgentAction } from "@/agent-page/CopyAgentAction";
import { NewKeyAction } from "@/agent-page/NewKeyAction";
import { RemoveAgentAction } from "@/agent-page/RemoveAgentAction";
import { SHORTCUT_FLAGS } from "@/lib/shortcutFlags";

export type ShortcutTargetKind = "team" | "project" | "serviceaccount";

/** The row a shortcut starts from: a detail page's own team, project or service account. */
export interface ShortcutTarget {
	kind: ShortcutTargetKind;
	id: string;
	name: string;
	label: string;
	/** A service account's metadata labels; unset for teams and projects. */
	labels?: Record<string, string>;
}

export interface Shortcut {
	/** Runtime flag (`/config.json` `features`) that turns it on; absent = off. */
	flag: string;
	targets: readonly ShortcutTargetKind[];
	/** The header action; it owns its own link or dialog. */
	Action: ComponentType<{ target: ShortcutTarget }>;
}

/** Every shortcut a detail page may offer. Dropping one is removing its line and its folder. */
export const SHORTCUTS: readonly Shortcut[] = [
	{
		flag: SHORTCUT_FLAGS.agentKey,
		targets: ["serviceaccount"],
		Action: NewKeyAction,
	},
	{
		flag: SHORTCUT_FLAGS.copyAgent,
		targets: ["serviceaccount"],
		Action: CopyAgentAction,
	},
	{
		flag: SHORTCUT_FLAGS.removeAgent,
		targets: ["serviceaccount"],
		Action: RemoveAgentAction,
	},
];
