import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import type { ShortcutTargetKind } from "@/shortcuts/registry";
import { targetPage } from "@/shortcuts/TargetLink";

/** A shortcut form's head: the way back to its target, the title, and what it does. */
export function ShortcutHeader({
	kind,
	name,
	back,
	title,
	description,
}: {
	kind: ShortcutTargetKind | undefined;
	name?: string;
	back: string;
	title: string;
	description: string;
}) {
	return (
		<PageHeader
			back={<BackLink {...targetPage(kind, name)}>{back}</BackLink>}
			title={title}
			description={description}
		/>
	);
}
