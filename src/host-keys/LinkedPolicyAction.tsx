import { Link } from "@tanstack/react-router";
import type { LinkedPolicyRow } from "./linkedPolicies";

/** The pools a policy reaches the key through; the link is changed on the pool. */
export function LinkedPolicyAction({ row }: { row: LinkedPolicyRow }) {
	if (row.viaPools.length === 0) return null;
	return (
		<span className="text-[11px] text-muted-foreground">
			via{" "}
			{row.viaPools.map((pool, i) => (
				<span key={pool.name}>
					{i > 0 && ", "}
					<Link
						to="/pools/$name"
						params={{ name: pool.name }}
						className="text-foreground hover:underline"
					>
						{pool.label}
					</Link>
				</span>
			))}
		</span>
	);
}
