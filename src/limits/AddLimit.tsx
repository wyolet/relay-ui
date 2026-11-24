import type { ReactNode } from "react";
import { LimitAdded } from "@/limits/LimitAdded";
import { LimitStep } from "@/limits/LimitStep";
import { ReviewStep } from "@/limits/ReviewStep";
import { TargetLink } from "@/limits/TargetLink";
import {
	LIMIT_FORM_STEPS,
	type LimitFormStep,
	type LimitStart,
	useAddLimitForm,
} from "@/limits/useAddLimitForm";
import { useLimitTarget } from "@/limits/useLimitTarget";
import { useOpenTarget } from "@/limits/useOpenTarget";
import { PageLoader } from "@/shared/Spinner";
import { StepForm } from "@/shared/StepForm";
import type { ShortcutTargetKind } from "@/shortcuts/registry";

const STEP_LABELS: Record<LimitFormStep, string> = {
	limit: "Limit",
	review: "Review",
};

const STEPS = [
	...LIMIT_FORM_STEPS.map((id) => ({ id, label: STEP_LABELS[id] })),
	{ id: "added", label: "Done" },
];

const BACK_LINK = "text-xs text-foreground underline underline-offset-2";

/** Why the form isn't offered, in place of it. */
function NoFormNotice({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col items-start gap-2 text-xs text-muted-foreground">
			{children}
		</div>
	);
}

function LimitForm({ start }: { start: LimitStart }) {
	const limit = useAddLimitForm(start);
	const openTarget = useOpenTarget(start.target);
	const { step, writes, target } = limit;
	if (limit.heldAbove) {
		return (
			<NoFormNotice>
				<p>{limit.caseLine}</p>
				<TargetLink kind={target.kind} name={target.name} className={BACK_LINK}>
					Back to {target.label}
				</TargetLink>
			</NoFormNotice>
		);
	}
	return (
		<StepForm
			steps={STEPS}
			form={limit}
			finishLabel="Add limit"
			runTitle="Adding the limit"
			result={writes.added && <LimitAdded added={writes.added} />}
			onCancel={openTarget}
		>
			{step === "limit" && <LimitStep limit={limit} />}
			{step === "review" && <ReviewStep limit={limit} />}
		</StepForm>
	);
}

/** Add a limit to the team, project or service account `kind` and `id` name. */
export function AddLimit({
	kind,
	id,
}: {
	kind: ShortcutTargetKind | undefined;
	id: string;
}) {
	const state = useLimitTarget(kind, id);
	switch (state.status) {
		case "loading":
			return <PageLoader />;
		case "notFound":
			return (
				<NoFormNotice>
					<p>Not found: there is no such team, project or agent to limit.</p>
					<TargetLink kind={kind} className={BACK_LINK}>
						Back
					</TargetLink>
				</NoFormNotice>
			);
		case "failed":
			return (
				<NoFormNotice>
					<p role="alert" className="text-destructive">
						{state.message}
					</p>
				</NoFormNotice>
			);
		case "noAccount":
			return (
				<NoFormNotice>
					<p>
						Relay hasn't opened an account for {state.target.label} yet. Try
						again in a moment.
					</p>
					<TargetLink
						kind={kind}
						name={state.target.name}
						className={BACK_LINK}
					>
						Back to {state.target.label}
					</TargetLink>
				</NoFormNotice>
			);
		case "ready":
			return <LimitForm key={state.target.id} start={state} />;
	}
}
