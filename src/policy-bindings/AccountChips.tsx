import { Link } from "@tanstack/react-router";
import { useAccountLabels } from "@/policy-bindings/useAccountLabels";
import { Chip } from "@/shared/Chip";

type AccountLabelParts = ReturnType<
	ReturnType<typeof useAccountLabels>["labelOf"]
>;

/** An account chip's text: the kind muted beside the name, linking to the account when it can. */
export function AccountChipLabel({
	account,
	link = true,
}: {
	account: AccountLabelParts;
	link?: boolean;
}) {
	const { name, kind, title, sharedBy } = account;
	return (
		<>
			{kind && <span className="text-muted-foreground">{kind}</span>}{" "}
			{link && name ? (
				<Link
					to="/accounts/$name"
					params={{ name }}
					className="hover:underline"
				>
					{title}
				</Link>
			) : (
				title
			)}
			{sharedBy && (
				<span className="text-muted-foreground"> shared by {sharedBy}</span>
			)}
		</>
	);
}

/** A binding's accounts as chips, each linking to its account. */
export function AccountChips({
	accountIds,
}: {
	accountIds: readonly string[];
}) {
	const { labelOf } = useAccountLabels();
	return (
		<div className="flex flex-wrap gap-1">
			{accountIds.map((id) => (
				<Chip
					key={id}
					shape="box"
					label={<AccountChipLabel account={labelOf(id)} />}
				/>
			))}
		</div>
	);
}
