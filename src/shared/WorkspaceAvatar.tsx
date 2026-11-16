import { Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { contextInitials, type WorkContext } from "@/lib/workContext";

const SIZE = {
	sm: "size-5 rounded text-[9px]",
	md: "size-8 rounded-md text-xs",
} as const;

/** A workspace's mark: a team or project's initials, an icon for you and the organization. */
export function WorkspaceAvatar({
	context,
	size = "md",
}: {
	context: WorkContext;
	size?: keyof typeof SIZE;
}) {
	const Icon =
		context.kind === "personal"
			? UserRound
			: context.kind === "organization"
				? Building2
				: undefined;
	return (
		<span
			aria-hidden
			className={cn(
				"flex shrink-0 items-center justify-center bg-sidebar-accent font-semibold tracking-wide text-sidebar-accent-foreground",
				SIZE[size],
			)}
		>
			{Icon ? (
				<Icon className={size === "sm" ? "size-3" : "size-4"} />
			) : (
				contextInitials(context)
			)}
		</span>
	);
}
