import { type ReactNode, useId } from "react";
import type { ReachChoice } from "@/policies/policyReach";
import { Segmented, type SegmentedOption } from "@/shared/Segmented";

const REACH_OPTIONS: readonly SegmentedOption<ReachChoice>[] = [
	{ value: "scope", label: "Every credential in scope" },
	{ value: "pools", label: "Only these pools" },
];

const REACH_HINTS: Record<ReachChoice, string> = {
	scope: "Requests use the keys this scope owns, then the system's.",
	pools: "Linking pools limits this policy to their keys.",
};

/** The reach choice; `pools` renders the pool picker passed as children. */
export function PolicyReachPicker({
	value,
	onChange,
	error,
	children,
}: {
	value: ReachChoice | undefined;
	onChange: (next: ReachChoice) => void;
	error: string | undefined;
	children: ReactNode;
}) {
	const errorId = useId();
	return (
		<div className="flex flex-col gap-3">
			<fieldset aria-describedby={error ? errorId : undefined}>
				<legend className="sr-only">Reach</legend>
				<Segmented options={REACH_OPTIONS} value={value} onChange={onChange} />
				{value && (
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						{REACH_HINTS[value]}
					</p>
				)}
				{error && (
					<p id={errorId} className="mt-1.5 text-[11px] text-destructive">
						{error}
					</p>
				)}
			</fieldset>
			{value === "pools" && children}
		</div>
	);
}
