import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { WriteRunPhase, WriteStatus } from "@/hooks/useWriteRunner";
import { StickyFooter } from "@/shared/FormFooter";
import { Stepper, type StepperStep } from "@/shared/Stepper";
import { WriteRun } from "@/shared/WriteRun";

export interface StepFormWrites {
	phase: WriteRunPhase;
	steps: readonly {
		write: { id: string; label: string };
		status: WriteStatus;
	}[];
	doneCount: number;
	error: string | null;
	retry: () => Promise<unknown>;
	reset: () => void;
}

export interface StepFormState {
	stepIndex: number;
	lastStep: boolean;
	next: () => void;
	back: () => void;
	writes: StepFormWrites;
}

/**
 * A multi-step form whose last step sends a list of writes: the open step
 * with Cancel, Back and Next, then the run, then `result` once it is done.
 */
export function StepForm({
	steps,
	form,
	finishLabel,
	runTitle,
	result,
	onCancel,
	children,
}: {
	/** The form's steps, then the one the result shows under. */
	steps: readonly StepperStep[];
	form: StepFormState;
	/** The last step's submit, e.g. "Create agent". */
	finishLabel: string;
	/** What the run makes, e.g. "Creating the agent". */
	runTitle: string;
	/** Shown once the run is done; until it is set the run stays on screen. */
	result: ReactNode;
	onCancel: () => void;
	/** The open step's fields. */
	children: ReactNode;
}) {
	const { stepIndex, lastStep, writes } = form;

	if (writes.phase !== "idle") {
		return (
			<div className="flex flex-col gap-8">
				<Stepper steps={steps} current={steps.length - 1} />
				{writes.phase === "done" && result ? (
					result
				) : (
					<WriteRun
						title={runTitle}
						phase={writes.phase}
						items={writes.steps.map(({ write, status }) => ({
							id: write.id,
							label: write.label,
							status,
						}))}
						doneCount={writes.doneCount}
						error={writes.error}
						onRetry={() => void writes.retry()}
						onEdit={writes.reset}
					/>
				)}
			</div>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.next();
			}}
			className="flex flex-col gap-8"
		>
			<Stepper steps={steps} current={stepIndex} />

			{children}

			<StickyFooter>
				<Button type="button" variant="outline" size="lg" onClick={onCancel}>
					Cancel
				</Button>
				{stepIndex > 0 && (
					<Button type="button" variant="outline" size="lg" onClick={form.back}>
						Back
					</Button>
				)}
				{/* The second click of a double-click on Next lands on the final submit; `detail` counts clicks. */}
				<Button
					key={lastStep ? "finish" : "next"}
					type="submit"
					variant="cta"
					size="lg"
					onClick={(e) => {
						if (e.detail > 1) e.preventDefault();
					}}
				>
					{lastStep ? finishLabel : "Next"}
				</Button>
			</StickyFooter>
		</form>
	);
}
