import {
	AccessCheckFailureNotice,
	AccessReviewResult,
} from "@/access-review/AccessReviewResult";
import {
	ACTION_VERBS,
	type AccessCheckTarget,
	OWNER_KINDS,
	RESOURCE_KINDS,
	useAccessCheckForm,
} from "@/access-review/useAccessCheckForm";
import type { AccessReviewSubject } from "@/api/hooks/accessReview";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Segmented } from "@/shared/Segmented";

const TARGET_OPTIONS = [
	{ value: "row", label: "One row" },
	{ value: "collection", label: "Collection" },
] as const satisfies readonly { value: AccessCheckTarget; label: string }[];

const KIND_ITEMS = RESOURCE_KINDS.map((k) => ({ value: k, label: k }));
const VERB_ITEMS = ACTION_VERBS.map((v) => ({ value: v, label: v }));
// base-ui's Select needs a non-empty value per item; "any" stands for no owner.
const ANY_OWNER = "any";
const OWNER_ITEMS = [
	{ value: ANY_OWNER, label: "Any owner" },
	...OWNER_KINDS.map((k) => ({ value: k, label: k })),
];

function FieldLabel({
	htmlFor,
	children,
}: {
	htmlFor?: string;
	children: string;
}) {
	return (
		<label
			htmlFor={htmlFor}
			className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
		>
			{children}
		</label>
	);
}

/**
 * Asks relay whether `subject` (or, without one, the signed-in caller) may
 * perform an action, and which role binding or rule decides it.
 */
export function AccessCheckDialog({
	subject,
	subjectLabel,
	onClose,
}: {
	subject?: AccessReviewSubject;
	subjectLabel?: string;
	onClose: () => void;
}) {
	const {
		form,
		values,
		nameError,
		ownerNameError,
		result,
		failure,
		isChecking,
	} = useAccessCheckForm(subject);

	return (
		<Dialog open onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{subjectLabel
							? `Check access for ${subjectLabel}`
							: "Check my access"}
					</DialogTitle>
					<DialogDescription>
						Whether {subjectLabel ?? "you"} may perform an action, and which
						role binding or rule decides it. Nothing is performed.
					</DialogDescription>
				</DialogHeader>

				<form
					id="access-check"
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="flex flex-col gap-3"
				>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<FieldLabel>Resource</FieldLabel>
							<Select
								value={values.kind}
								items={KIND_ITEMS}
								onValueChange={(v) => v && form.setFieldValue("kind", v)}
							>
								<SelectTrigger className="w-full" aria-label="Resource kind">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{KIND_ITEMS.map((k) => (
										<SelectItem key={k.value} value={k.value}>
											{k.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<FieldLabel>Action</FieldLabel>
							<Select
								value={values.verb}
								items={VERB_ITEMS}
								onValueChange={(v) => v && form.setFieldValue("verb", v)}
							>
								<SelectTrigger className="w-full" aria-label="Action">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{VERB_ITEMS.map((v) => (
										<SelectItem key={v.value} value={v.value}>
											{v.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<Segmented
						options={TARGET_OPTIONS}
						value={values.target}
						onChange={(v) => form.setFieldValue("target", v)}
					/>

					{values.target === "row" ? (
						<div className="flex flex-col gap-1.5">
							<FieldLabel htmlFor="access-check-name">Name</FieldLabel>
							<Input
								id="access-check-name"
								value={values.name}
								onChange={(e) =>
									form.setFieldValue("name", e.currentTarget.value)
								}
								placeholder="Row slug"
								aria-invalid={nameError ? true : undefined}
								aria-describedby={
									nameError ? "access-check-name-error" : undefined
								}
							/>
							{nameError && (
								<p
									id="access-check-name-error"
									className="text-[11px] text-destructive"
								>
									{nameError}
								</p>
							)}
						</div>
					) : (
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<FieldLabel>Owner</FieldLabel>
								<Select
									value={values.ownerKind || ANY_OWNER}
									items={OWNER_ITEMS}
									onValueChange={(v) => {
										const kind = OWNER_KINDS.find((k) => k === v);
										form.setFieldValue("ownerKind", kind ?? "");
									}}
								>
									<SelectTrigger className="w-full" aria-label="Owner kind">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{OWNER_ITEMS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{values.ownerKind && values.ownerKind !== "system" && (
								<div className="flex flex-col gap-1.5">
									<FieldLabel htmlFor="access-check-owner">
										Owner name
									</FieldLabel>
									<Input
										id="access-check-owner"
										value={values.ownerName}
										onChange={(e) =>
											form.setFieldValue("ownerName", e.currentTarget.value)
										}
										placeholder={
											values.ownerKind === "user" ? "Username" : "Slug"
										}
										aria-invalid={ownerNameError ? true : undefined}
										aria-describedby={
											ownerNameError ? "access-check-owner-error" : undefined
										}
									/>
									{ownerNameError && (
										<p
											id="access-check-owner-error"
											className="text-[11px] text-destructive"
										>
											{ownerNameError}
										</p>
									)}
								</div>
							)}
						</div>
					)}
				</form>

				{failure && <AccessCheckFailureNotice failure={failure} />}
				{result && <AccessReviewResult review={result} />}

				<DialogFooter>
					<Button type="button" variant="ghost" onClick={onClose}>
						Close
					</Button>
					<Button type="submit" form="access-check" disabled={isChecking}>
						{isChecking ? "Checking…" : "Check"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
