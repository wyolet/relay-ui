import { Link } from "@tanstack/react-router";
import type { components } from "@/api/types.gen";

type BoundPolicy = components["schemas"]["BoundPolicy"];

/** An account's policy as a link; an organization policy the caller may not see is named by kind only. */
export function BoundPolicyLink({
	policy,
	className,
}: {
	policy: BoundPolicy | undefined;
	className: string;
}) {
	if (!policy) return <span className="text-muted-foreground">No policy</span>;
	if (!policy.name) {
		return <span className="text-muted-foreground">Organization policy</span>;
	}
	return (
		<Link
			to="/policies/$name"
			params={{ name: policy.name }}
			className={className}
		>
			{policy.name}
		</Link>
	);
}
