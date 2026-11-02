import { Link } from "@tanstack/react-router";
import { Field } from "./Field";
import { useLaneAccount } from "./useLaneAccount";

/** The account a request ran in, linked by name; the raw id when the
 * account can't be resolved. */
export function LaneAccountField({ id }: { id: string }) {
	const account = useLaneAccount(id);
	return (
		<Field label="Lane account">
			{account ? (
				<Link
					to="/accounts/$name"
					params={{ name: account.name }}
					className="hover:underline"
				>
					{account.label}
				</Link>
			) : (
				<span className="font-mono">{id}</span>
			)}
		</Field>
	);
}
