import type { PolicyBinding } from "@/api/types/policyBinding";
import { OwnerLink } from "@/projects/OwnerLink";

/** Who owns a binding: a team, project or user as a linked chip; the organization or the system as quiet text. */
export function BindingOwner({ binding }: { binding: PolicyBinding }) {
	const owner = binding.metadata.owner;
	if (
		owner?.kind === "team" ||
		owner?.kind === "project" ||
		owner?.kind === "user"
	) {
		return <OwnerLink owner={owner} showUser />;
	}
	return (
		<span className="text-muted-foreground">
			{owner?.kind === "organization" ? "Organization" : "System"}
		</span>
	);
}
