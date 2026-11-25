import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
	id: string;
	label: string;
}

/** The numbered steps of a multi-step form; steps before `current` read as done. */
export function Stepper({
	steps,
	current,
}: {
	steps: readonly StepperStep[];
	/** Index of the open step; `steps.length` marks every step done. */
	current: number;
}) {
	return (
		<ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
			{steps.map((step, index) => {
				const done = index < current;
				const open = index === current;
				return (
					<li
						key={step.id}
						aria-current={open ? "step" : undefined}
						className="flex items-center gap-3"
					>
						{index > 0 && (
							<span
								aria-hidden="true"
								className={cn(
									"h-px w-8",
									done || open ? "bg-primary" : "bg-border",
								)}
							/>
						)}
						<span className="flex items-center gap-2">
							<span
								className={cn(
									"flex size-5 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums",
									done && "border-primary bg-primary text-primary-foreground",
									open && "border-primary text-foreground",
									!done && !open && "border-border text-muted-foreground",
								)}
							>
								{done ? (
									<Check className="size-3" aria-hidden="true" />
								) : (
									index + 1
								)}
							</span>
							<span
								className={cn(
									"text-xs",
									open
										? "font-medium text-foreground"
										: "text-muted-foreground",
								)}
							>
								{step.label}
							</span>
						</span>
					</li>
				);
			})}
		</ol>
	);
}
