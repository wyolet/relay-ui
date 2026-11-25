import { Link } from "@tanstack/react-router";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { AccountChips } from "@/policy-bindings/AccountChips";
import { BindingOwner } from "@/policy-bindings/BindingOwner";
import { LineColumns, LineName, LineRow, QuietTag } from "@/shared/LineGrid";
import { RowMenu } from "@/shared/RowMenu";

/** The bound policy's slug and display label. */
export interface BoundPolicyName {
	name: string;
	label: string;
}

// The tracks' minimums plus gaps come to 45rem, the table's min-w.
const COLS =
	"grid-cols-[minmax(12rem,1.6fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(12rem,2fr)_2rem]";

/** The table's column labels, on the rows' grid. */
export function PolicyBindingColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Name</span>
			<span>Owner</span>
			<span>Policy</span>
			<span>Accounts</span>
			<span />
		</LineColumns>
	);
}

/** One binding: who owns it, the policy it applies, and its accounts. */
export function PolicyBindingRow({
	binding,
	policy,
	onDelete,
}: {
	binding: PolicyBinding;
	policy: BoundPolicyName | undefined;
	onDelete: () => void;
}) {
	const name = binding.metadata.name;
	const enabled = binding.spec.enabled !== false;
	return (
		<LineRow cols={COLS} dimmed={!enabled}>
			<LineName
				slug={hasDisplayName(binding.metadata) ? name : undefined}
				name={
					<Link
						to="/policy-bindings/$name"
						params={{ name }}
						className="truncate text-foreground hover:underline"
					>
						{displayLabel(binding.metadata)}
					</Link>
				}
			>
				{!enabled && <QuietTag title="The binding is disabled">off</QuietTag>}
			</LineName>
			<span className="min-w-0 truncate">
				<BindingOwner binding={binding} />
			</span>
			<span className="min-w-0 truncate">
				{policy ? (
					<Link
						to="/policies/$name"
						params={{ name: policy.name }}
						className="text-foreground hover:underline"
					>
						{policy.label}
					</Link>
				) : (
					<code className="font-mono text-foot">
						{binding.spec.policyId.slice(0, 8)}…
					</code>
				)}
			</span>
			<span className="min-w-0">
				<AccountChips accountIds={binding.spec.accountIds ?? []} />
			</span>
			<span className="flex justify-end">
				<RowMenu
					actions={[
						{
							label: "Edit",
							render: (
								<Link to="/policy-bindings/$name/edit" params={{ name }} />
							),
						},
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</span>
		</LineRow>
	);
}
