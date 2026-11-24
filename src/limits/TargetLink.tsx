import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { ShortcutTargetKind } from "@/shortcuts/registry";

/** The target's page; without a name, its kind's list; without a kind, home. */
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
	switch (kind) {
		case "team":
			return name ? (
				<Link to="/teams/$name" params={{ name }} className={className}>
					{children}
				</Link>
			) : (
				<Link to="/teams" className={className}>
					{children}
				</Link>
			);
		case "project":
			return name ? (
				<Link to="/projects/$name" params={{ name }} className={className}>
					{children}
				</Link>
			) : (
				<Link to="/projects" className={className}>
					{children}
				</Link>
			);
		case "serviceaccount":
			return name ? (
				<Link
					to="/service-accounts/$name"
					params={{ name }}
					className={className}
				>
					{children}
				</Link>
			) : (
				<Link to="/service-accounts" className={className}>
					{children}
				</Link>
			);
		default:
			return (
				<Link to="/" className={className}>
					{children}
				</Link>
			);
	}
}
