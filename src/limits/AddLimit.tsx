import type { ReactNode } from "react";
import { LimitAdded } from "@/limits/LimitAdded";
import { LimitStep } from "@/limits/LimitStep";
import { ReviewStep } from "@/limits/ReviewStep";
import {
	LIMIT_FORM_STEPS,
	type LimitFormStep,
	type LimitStart,
	useAddLimitForm,
} from "@/limits/useAddLimitForm";
import { useLimitTarget } from "@/limits/useLimitTarget";
import { PolicySetAbove } from "@/policy-bindings/PolicyLine";
import { PageLoader } from "@/shared/Spinner";
import { StepForm } from "@/shared/StepForm";
import type { ShortcutTargetKind } from "@/shortcuts/registry";
import { ShortcutHeader } from "@/shortcuts/ShortcutHeader";
import { useOpenTarget } from "@/shortcuts/TargetLink";

const STEP_LABELS: Record<LimitFormStep, string> = {
	limit: "Limit",
	review: "Review",
};

const STEPS = [
	...LIMIT_FORM_STEPS.map((id) => ({ id, label: STEP_LABELS[id] })),
	{ id: "added", label: "Done" },
];

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
	const openTarget = useOpenTarget();
	const { step, target } = limit;
	if (limit.currentLoading) return <PageLoader />;
	if (limit.heldAbove) {
		return <PolicySetAbove message={limit.heldAboveMessage} />;
	}
	return (
		<StepForm
			steps={STEPS}
			form={limit}
			finishLabel="Add limit"
			finishDisabled={limit.finishDisabled}
			runTitle="Adding the limit"
			result={limit.added && <LimitAdded added={limit.added} />}
			onCancel={() => openTarget(target.kind, target.name)}
		>
			{step === "limit" && <LimitStep limit={limit} />}
			{step === "review" && <ReviewStep limit={limit} />}
		</StepForm>
	);
}

/** What stands in the form's place for each state of its target. */
function LimitBody({ state }: { state: ReturnType<typeof useLimitTarget> }) {
	switch (state.status) {
		case "loading":
			return <PageLoader />;
		case "notFound":
			return (
				<NoFormNotice>
					<p>Not found: there is no such team, project or agent to limit.</p>
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
				</NoFormNotice>
			);
		case "ready":
			return <LimitForm key={state.target.id} start={state} />;
	}
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
	const target =
		state.status === "ready" || state.status === "noAccount"
			? state.target
			: undefined;
	return (
		<div>
			<ShortcutHeader
				kind={kind}
				name={target?.name}
				back={target?.label ?? "Back"}
				title="Add a limit"
				description="Put a spend cap or a rate limit on a team, project or agent."
			/>
			<LimitBody state={state} />
		</div>
	);
}
