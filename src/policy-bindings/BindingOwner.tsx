import { useQuery } from "@tanstack/react-query";
import { usersListQueryOptions } from "@/api/hooks/users";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { OwnerLink } from "@/projects/OwnerLink";

/** Who owns a binding: the system, a user, or a linked team or project. */
export function BindingOwner({ binding }: { binding: PolicyBinding }) {
	const owner = binding.metadata.owner;
	const userId = owner?.kind === "user" ? (owner.id ?? "") : "";
	const { data: users } = useQuery({
		...usersListQueryOptions,
		enabled: userId.length > 0,
	});
	if (owner?.kind === "team" || owner?.kind === "project") {
		return <OwnerLink owner={owner} />;
	}
	if (owner?.kind === "user") {
		const username = users?.find((u) => u.id === userId)?.username;
		return (
			<span className="text-foreground">
				User · {username ?? `${userId.slice(0, 8)}…`}
			</span>
		);
	}
	return <span className="text-foreground">System</span>;
}
