import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
	hiddenStoppedLine,
	moreStoppedLine,
	type PseudoUnder,
	stoppedLanes,
	UNDER_CONFIRM_LABEL,
	underSentences,
} from "@/pseudo/under";
import type { UnderConfirm } from "@/pseudo/useUnderConfirm";
import { AlertBanner } from "@/shared/AlertBanner";

const STOPPED_TITLE = "Will stop working";

function StoppedList({ under }: { under: PseudoUnder }) {
	const lanes = stoppedLanes(under);
	const counted = [moreStoppedLine(under), hiddenStoppedLine(under)].filter(
		(line): line is string => line !== undefined,
	);
	return (
		<div className="flex flex-col gap-1">
			<p className="font-medium text-foreground">{STOPPED_TITLE}</p>
			<ul aria-label={STOPPED_TITLE} className="flex flex-col gap-1">
				{lanes.map((lane) => (
					<li key={lane.id} className="grid grid-cols-[7rem_1fr] gap-3">
						<span className="text-muted-foreground">{lane.kind}</span>
						<span className="truncate text-foreground">{lane.name}</span>
					</li>
				))}
				{counted.map((line) => (
					<li key={line} className="text-muted-foreground">
						{line}
					</li>
				))}
			</ul>
		</div>
	);
}

/** What a dry run says the change does to the accounts under a team or project, with the confirm a save needs when some stop working. */
export function AccountsUnder({
	state,
	target,
}: {
	state: UnderConfirm;
	/** The target's label, e.g. "Platform". */
	target: string;
}) {
	const confirmId = useId();
	const { under, confirmNeeded, confirmed, setConfirmed } = state;
	if (!under) return null;
	const title = `Accounts under ${target}`;
	return (
		<section aria-label={title} className="max-w-2xl">
			<AlertBanner severity={confirmNeeded ? "warn" : "info"} title={title}>
				<div className="mt-0.5 flex flex-col gap-2">
					<div className="flex flex-col gap-0.5">
						{underSentences(under, target).map((s) => (
							<p key={s}>{s}</p>
						))}
					</div>
					{confirmNeeded && (
						<>
							<StoppedList under={under} />
							<label
								htmlFor={confirmId}
								className="flex cursor-pointer items-center gap-2 text-foreground"
							>
								<Checkbox
									id={confirmId}
									checked={confirmed}
									onCheckedChange={(on) => setConfirmed(on)}
								/>
								{UNDER_CONFIRM_LABEL}
							</label>
						</>
					)}
				</div>
			</AlertBanner>
		</section>
	);
}
