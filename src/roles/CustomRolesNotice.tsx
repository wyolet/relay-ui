import { Link } from "@tanstack/react-router";

/** Why the create/edit affordances are off on a community deployment. */
export function CustomRolesNotice() {
	return (
		<p className="text-[11px] text-muted-foreground">
			Authoring roles of your own needs a license — the built-in roles are
			always available.{" "}
			<Link to="/settings/license" className="underline hover:text-foreground">
				Manage the license
			</Link>
			.
		</p>
	);
}
