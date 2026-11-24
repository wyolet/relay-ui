import { feature } from "@/api/runtimeConfig";
import { SHORTCUTS, type ShortcutTarget } from "@/shortcuts/registry";

/** The enabled shortcuts for a detail page's row, as header actions. */
export function ShortcutActions({ target }: { target: ShortcutTarget }) {
	return SHORTCUTS.filter(
		(s) => s.targets.includes(target.kind) && feature(s.flag),
	).map((s) => <s.Action key={s.flag} target={target} />);
}
