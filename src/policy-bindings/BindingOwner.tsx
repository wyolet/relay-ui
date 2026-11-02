import type {
	PolicyBinding,
	PolicyBindingSubject,
} from "@/api/types/policyBinding";
import { OwnerLink } from "@/projects/OwnerLink";

/** Who owns a binding: the system, a user, or a linked team or project. */
export function BindingOwner({
	binding,
	subjectName,
}: {
	binding: PolicyBinding;
	subjectName: (subject: PolicyBindingSubject) => string;
}) {
	const owner = binding.spec.projectId
		? { kind: "project" as const, id: binding.spec.projectId }
		: binding.metadata.owner;
	if (owner?.kind === "team" || owner?.kind === "project") {
		return <OwnerLink owner={owner} />;
	}
	if (owner?.kind === "user") {
		return (
			<span className="text-foreground">
				User · {subjectName({ kind: "user", id: owner.id ?? "" })}
			</span>
		);
	}
	return <span className="text-foreground">System</span>;
}
