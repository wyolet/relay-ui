import { CheckCircle2, XCircle } from "lucide-react";
import {
	type AccessCheckFailure,
	type AccessReview,
	describeChain,
	describeDecision,
	describeRef,
} from "@/lib/accessReview";
import { AlertBanner } from "@/shared/AlertBanner";
import { Chip } from "@/shared/Chip";

export function AccessReviewResult({ review }: { review: AccessReview }) {
	const { allowed, subject, resource } = review;
	const chain = describeChain(review.chain);
	const target = resource.name
		? describeRef(resource)
		: resource.owner
			? `${resource.kind} in ${describeRef(resource.owner)}`
			: resource.kind;

	return (
		<section
			aria-label="Access check result"
			className="flex flex-col gap-3 rounded-md border border-border bg-card p-3"
		>
			<div className="flex items-start gap-2">
				{allowed ? (
					<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
				) : (
					<XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
				)}
				<div className="min-w-0">
					<div
						className={`text-sm font-medium ${allowed ? "text-success" : "text-destructive"}`}
					>
						{allowed ? "Allowed" : "Denied"}
					</div>
					<div className="text-[11px] text-muted-foreground">
						<code className="font-mono">{review.action}</code> on {target}
					</div>
				</div>
			</div>

			<p className="text-xs text-foreground">{describeDecision(review)}</p>

			{subject.disabled && (
				<AlertBanner severity="warn" title="Account disabled">
					{describeRef(subject)} cannot sign in. This is what it would hold if
					enabled.
				</AlertBanner>
			)}
			{review.credentialDenied && (
				<AlertBanner severity="warn" title="Credential limits refuse it">
					The role allows this action, but the credential's own limits refuse
					it.
				</AlertBanner>
			)}

			{chain && (
				<div className="flex flex-col gap-1">
					<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
						Scope chain
					</span>
					<span className="text-[11px] text-foreground">{chain}</span>
				</div>
			)}
			{(subject.subjects ?? []).length > 0 && (
				<div className="flex flex-col gap-1">
					<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
						Evaluated as
					</span>
					<div className="flex flex-wrap gap-1">
						{(subject.subjects ?? []).map((s) => (
							<Chip key={s} label={s} mono shape="box" />
						))}
					</div>
				</div>
			)}
		</section>
	);
}

export function AccessCheckFailureNotice({
	failure,
}: {
	failure: AccessCheckFailure;
}) {
	switch (failure.kind) {
		case "needs-rbac":
			return (
				<AlertBanner severity="info" title="Access checks need RBAC">
					This relay runs with RELAY_AUTHZ=single, where every signed-in caller
					may perform every action.
				</AlertBanner>
			);
		case "not-found":
			return (
				<AlertBanner severity="warn" title="Not found">
					{failure.message}
				</AlertBanner>
			);
		default:
			return <AlertBanner severity="error">{failure.message}</AlertBanner>;
	}
}
