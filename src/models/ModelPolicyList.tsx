import { Link } from "@tanstack/react-router";
import type { ModelPolicyView } from "@/api/hooks/models";
import { fmtLimit } from "@/lib/limitsFormat";
import { Section } from "@/shared/Section";

/** The policies that grant the model, each with the rate-limit rules it
 * applies to it. */
export function ModelPolicyList({ policies }: { policies: ModelPolicyView[] }) {
	return (
		<Section
			title="Who can use it"
			meta={
				policies.length > 0
					? `${policies.length} ${policies.length === 1 ? "policy" : "policies"}`
					: undefined
			}
		>
			{policies.length === 0 ? (
				<p className="text-label text-ink-2">
					No policy grants this model. Add it to a policy's models to let keys
					call it.
				</p>
			) : (
				<ul className="grid grid-cols-1">
					{policies.map((p) => (
						<PolicyLine key={p.id} policy={p} />
					))}
				</ul>
			)}
		</Section>
	);
}

function PolicyLine({ policy }: { policy: ModelPolicyView }) {
	const limits = policy.limits ?? [];
	return (
		<li className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-rule py-2.5 text-label first:pt-0 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)]">
			<span className="flex min-w-0 items-baseline gap-2">
				<Link
					to="/policies/$name"
					params={{ name: policy.name }}
					className="truncate text-foreground hover:underline"
				>
					{policy.name}
				</Link>
				<span className="shrink-0 text-meta text-ink-3">
					{policy.owner.kind}
					{policy.owner.name && ` · ${policy.owner.name}`}
				</span>
			</span>
			<span className="min-w-0 text-ink-2 tabular-nums">
				{limits.length === 0 ? (
					<span className="text-ink-3">no rate limit</span>
				) : (
					limits.map(fmtLimit).join(" · ")
				)}
			</span>
		</li>
	);
}
