import { Link } from "@tanstack/react-router";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { displayLabel } from "@/lib/displayLabel";
import { serviceAccountOwner } from "@/lib/serviceAccountScope";
import {
	AccountLink,
	BoundPolicyLink,
	UNBOUND,
} from "@/policy-bindings/AccountPolicy";
import { useAccountPolicy } from "@/policy-bindings/useAccountPolicy";
import { OwnerLink } from "@/projects/OwnerLink";
import { useToggleServiceAccountEnabled } from "@/service-accounts/useToggleServiceAccountEnabled";
import {
	Dash,
	LineColumns,
	LineName,
	LineRow,
	QuietTag,
	SwitchCell,
} from "@/shared/LineGrid";
import { RowMenu } from "@/shared/RowMenu";

// The tracks' minimums plus gaps come to 49rem, the table's min-w.
const COLS =
	"grid-cols-[minmax(12rem,2fr)_minmax(8rem,1fr)_repeat(2,minmax(8rem,1.2fr))_3.5rem_2rem]";
export const SERVICE_ACCOUNT_MIN_W = "min-w-[49rem]";

/** The table's column labels, on the rows' grid. */
export function ServiceAccountColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Name</span>
			<span>Owner</span>
			<span>Account</span>
			<span>Policy</span>
			<span className="pr-3 text-right">On</span>
			<span />
		</LineColumns>
	);
}

/** One service account: who owns it, its own account and that account's policy. */
export function ServiceAccountRow({
	sa,
	onDelete,
}: {
	sa: ServiceAccount;
	onDelete: () => void;
}) {
	const { account, binding, policy } = useAccountPolicy({
		ownerOf: { kind: "serviceaccount", id: sa.metadata.id ?? "" },
	});
	const { setEnabled } = useToggleServiceAccountEnabled();
	const enabled = sa.spec.enabled ?? true;
	const label = displayLabel(sa.metadata);
	const name = sa.metadata.name;

	return (
		<LineRow cols={COLS} dimmed={!enabled}>
			<LineName
				slug={name}
				name={
					<Link
						to="/service-accounts/$name"
						params={{ name }}
						className="truncate text-foreground hover:underline"
					>
						{label}
					</Link>
				}
			/>
			<span className="min-w-0 truncate">
				<OwnerLink owner={serviceAccountOwner(sa)} showUser />
			</span>
			<span className="min-w-0 truncate">
				{account ? <AccountLink account={account} /> : <Dash />}
			</span>
			<span className="flex min-w-0 items-center gap-2">
				{binding ? (
					<>
						<BoundPolicyLink
							binding={binding}
							policy={policy}
							className="truncate hover:underline"
						/>
						{binding.spec.enabled === false && (
							<QuietTag title="The binding is disabled">off</QuietTag>
						)}
					</>
				) : (
					<Dash title={account ? UNBOUND : undefined} />
				)}
			</span>
			<SwitchCell
				checked={enabled}
				onChange={(next) => void setEnabled(sa, next)}
				label={`${enabled ? "Disable" : "Enable"} ${label}`}
			/>
			<span className="flex justify-end">
				<RowMenu
					actions={[
						{
							label: "Edit",
							render: (
								<Link to="/service-accounts/$name/edit" params={{ name }} />
							),
						},
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</span>
		</LineRow>
	);
}
