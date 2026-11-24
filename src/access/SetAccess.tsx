import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { POLICY_SET_ABOVE_LINE } from "@/access/accessPlan";
import type { AccessTarget, AccessTargetKind } from "@/access/accessTarget";
import { ReviewStep } from "@/access/ReviewStep";
import { SavedStep } from "@/access/SavedStep";
import { CurrentPolicyLine, SetAccessStep } from "@/access/SetAccessStep";
import { TargetLink, useOpenTarget } from "@/access/TargetLink";
import {
	type AccessOffers,
	type KnownCase,
	type OpenedAccess,
	useAccessCase,
	useAccessOpening,
} from "@/access/useAccessOpening";
import { useAccessTarget } from "@/access/useAccessTarget";
import {
	ACCESS_FORM_STEPS,
	type AccessFormStep,
	useSetAccessForm,
} from "@/access/useSetAccessForm";
import { PageLoader } from "@/shared/Spinner";
import { StepForm } from "@/shared/StepForm";

const STEP_LABELS: Record<AccessFormStep, string> = {
	access: "Access",
	review: "Review",
};

const STEPS = [
	...ACCESS_FORM_STEPS.map((id) => ({ id, label: STEP_LABELS[id] })),
	{ id: "saved", label: "Done" },
];

const BACK_LINK_CLASS =
	"inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors";

function Header({
	kind,
	name,
	back,
	subject,
}: {
	kind: AccessTargetKind | undefined;
	name?: string;
	back: string;
	subject?: string;
}) {
	return (
		<div>
			<TargetLink kind={kind} name={name} className={BACK_LINK_CLASS}>
				<ChevronLeft className="w-3.5 h-3.5" />
				{back}
			</TargetLink>
			<h1 className="mt-2 text-xl font-semibold text-foreground">Set access</h1>
			<p className="mt-1 text-xs text-muted-foreground">
				{subject
					? `What ${subject} may use: provider accounts and models. Saving replaces what it has now.`
					: "What a team, project or agent may use."}
			</p>
		</div>
	);
}

function SetAccessForm({
	target,
	offers,
	opened,
}: {
	target: AccessTarget;
	offers: AccessOffers;
	opened: OpenedAccess;
}) {
	const access = useSetAccessForm(target, offers, opened);
	const openTarget = useOpenTarget();
	const { step, saved } = access;
	return (
		<StepForm
			steps={STEPS}
			form={access}
			finishLabel="Save access"
			finishDisabled={access.finishDisabled}
			runTitle="Saving the access"
			result={saved && <SavedStep saved={saved} target={target} />}
			onCancel={() => openTarget(target.kind, target.name)}
		>
			{step === "access" && <SetAccessStep access={access} />}
			{step === "review" && <ReviewStep access={access} />}
		</StepForm>
	);
}

/** The form once the offers and the fields they fill are read. */
function SetAccessOffers({
	target,
	known,
}: {
	target: AccessTarget;
	known: KnownCase;
}) {
	const { opened, offers } = useAccessOpening(target, known);
	if (!opened) return <PageLoader />;
	return <SetAccessForm target={target} offers={offers} opened={opened} />;
}

/** What the target is under now; a policy set above the caller offers no fields. */
function SetAccessOpening({ target }: { target: AccessTarget }) {
	const state = useAccessCase(target);
	switch (state.status) {
		case "loading":
			return <PageLoader />;
		case "above":
			return (
				<div className="flex flex-col gap-1.5">
					<CurrentPolicyLine line={POLICY_SET_ABOVE_LINE} />
					{state.message && (
						<p className="text-xs text-muted-foreground">{state.message}</p>
					)}
				</div>
			);
		case "failed":
			return (
				<p role="alert" className="text-xs text-destructive">
					{state.message}
				</p>
			);
		case "known":
			return <SetAccessOffers target={target} known={state.known} />;
	}
}

/** The Set access page for the team, project or service account `kind` + `id` name. */
export function SetAccess({
	kind,
	id,
}: {
	kind: AccessTargetKind | undefined;
	id: string | undefined;
}) {
	const state = useAccessTarget(kind, id);
	if (state.status === "loading") return <PageLoader />;
	if (state.status !== "ready") {
		return (
			<div className="flex flex-col gap-6">
				<Header kind={kind} back="Back" />
				<p className="text-xs text-muted-foreground">
					{state.status === "noAccount"
						? `Relay hasn't opened ${state.label}'s account yet. Reload in a moment.`
						: "Not found: there is no such team, project or service account."}
				</p>
			</div>
		);
	}
	const { target } = state;
	return (
		<div className="flex flex-col gap-6">
			<Header
				kind={target.kind}
				name={target.name}
				back={target.label}
				subject={target.label}
			/>
			<Suspense fallback={<PageLoader />}>
				<SetAccessOpening target={target} />
			</Suspense>
		</div>
	);
}
