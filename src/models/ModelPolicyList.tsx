import { Link } from "@tanstack/react-router";
import type { ModelPolicyView } from "@/api/hooks/models";
import { fmtLimit } from "@/lib/limitsFormat";
import { Facts } from "@/shared/Facts";
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
	// Identical rules from different rate limits read once.
	const limits = [...new Set((policy.limits ?? []).map(fmtLimit))];
	const { kind, name } = policy.owner;
	return (
		<li className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-rule py-2.5 text-label first:pt-0 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)]">
			<span className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
				<Link
					to="/policies/$name"
					params={{ name: policy.name }}
					className="truncate text-foreground hover:underline"
				>
					{policy.name}
				</Link>
				<Facts
					items={[
						name
							? {
									label: kind.charAt(0).toUpperCase() + kind.slice(1),
									value: name,
								}
							: { label: "Owner", value: kind },
					]}
				/>
			</span>
			<span className="grid min-w-0 gap-0.5 text-ink-2 tabular-nums">
				{limits.length === 0 ? (
					<span className="text-ink-3">no rate limit</span>
				) : (
					limits.map((limit) => <span key={limit}>{limit}</span>)
				)}
			</span>
		</li>
	);
}
