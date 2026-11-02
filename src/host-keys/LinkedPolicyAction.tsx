import { Link } from "@tanstack/react-router";
import { Unlink2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LinkedPolicyRow } from "./linkedPolicies";

/** Detach for a direct link; a pool link is removed on the pool, so name it. */
export function LinkedPolicyAction({
	row,
	onDetach,
	detaching,
}: {
	row: LinkedPolicyRow;
	onDetach: (policyId: string) => void;
	detaching: boolean;
}) {
	if (row.direct) {
		return (
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onDetach(row.id)}
				disabled={detaching}
				title="Remove the policy's direct link to this key"
			>
				<Unlink2 className="size-3" />
				Detach
			</Button>
		);
	}
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
