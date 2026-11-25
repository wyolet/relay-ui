import { Link, linkOptions, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { ShortcutTargetKind } from "@/shortcuts/registry";

/** The target's page; with no `name`, the list of its kind (the dashboard without a kind). */
export function targetPage(
	kind: ShortcutTargetKind | undefined,
	name?: string,
) {
	switch (kind) {
		case "team":
			return name
				? linkOptions({ to: "/teams/$name", params: { name } })
				: linkOptions({ to: "/teams" });
		case "project":
			return name
				? linkOptions({ to: "/projects/$name", params: { name } })
				: linkOptions({ to: "/projects" });
		case "serviceaccount":
			return name
				? linkOptions({ to: "/service-accounts/$name", params: { name } })
				: linkOptions({ to: "/service-accounts" });
		default:
			return linkOptions({ to: "/" });
	}
}

export function TargetLink({
	kind,
	name,
	className,
	children,
}: {
	kind: ShortcutTargetKind | undefined;
	name?: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Link {...targetPage(kind, name)} className={className}>
			{children}
		</Link>
	);
}

/** Opens the target's page, as {@link TargetLink} links it. */
export function useOpenTarget() {
	const navigate = useNavigate();
	return (kind: ShortcutTargetKind | undefined, name?: string) =>
		void navigate(targetPage(kind, name));
}
