import { Link } from "@tanstack/react-router";
import { useAccountLabels } from "@/policy-bindings/useAccountLabels";
import { Chip } from "@/shared/Chip";

/** A binding's accounts as "Kind · name" chips, each linking to its account. */
export function AccountChips({
	accountIds,
}: {
	accountIds: readonly string[];
}) {
	const { labelOf } = useAccountLabels();
	return (
		<div className="flex flex-wrap gap-1">
			{accountIds.map((id) => {
				const { label, name } = labelOf(id);
				return (
					<Chip
						key={id}
						shape="box"
						label={
							name ? (
								<Link
									to="/accounts/$name"
									params={{ name }}
									className="hover:underline"
								>
									{label}
								</Link>
							) : (
								label
							)
						}
					/>
				);
			})}
		</div>
	);
}
