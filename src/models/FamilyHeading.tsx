/** The heading over one family's model rows, on the models page and the host
 * and provider Models tabs. */
export function FamilyHeading({ label }: { label: string }) {
	return (
		<h3 className="border-b border-rule py-2 text-foot font-medium tracking-wide text-ink-2 uppercase">
			{label}
		</h3>
	);
}
