import type { Account } from "@/api/hooks/accounts";
import type { PolicyBinding } from "@/api/types/policyBinding";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AttachEntity } from "@/policy-bindings/attachPolicy";
import { PolicySelectItems } from "@/policy-bindings/PolicySelectItems";
import { useAttachPolicyForm } from "@/policy-bindings/useAttachPolicyForm";

const ERROR_ID = "attach-policy-error";

/** Picks the policy the entity's account is bound to. */
export function AttachPolicyDialog({
	entity,
	account,
	binding,
	onClose,
}: {
	entity: AttachEntity;
	account: Account;
	binding: PolicyBinding | undefined;
	onClose: () => void;
}) {
	const {
		form,
		values,
		options,
		policyError,
		isSubmitting,
		sharedNote,
		setPolicy,
	} = useAttachPolicyForm({ entity, account, binding, onSaved: onClose });

	return (
		<Dialog open onOpenChange={(next) => !next && !isSubmitting && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{binding ? "Change policy" : "Attach policy"} · {entity.label}
					</DialogTitle>
					<DialogDescription>
						Requests in this account must pass the policy, on top of any policy
						above it.
					</DialogDescription>
				</DialogHeader>

				<form
					id="attach-policy"
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="flex flex-col gap-1.5"
				>
					<Select
						value={values.policyId || null}
						items={options}
						onValueChange={(v) => v && setPolicy(v)}
					>
						<SelectTrigger
							className="w-full"
							aria-label="Policy"
							aria-invalid={policyError ? true : undefined}
							aria-describedby={policyError ? ERROR_ID : undefined}
						>
							<SelectValue placeholder="Pick a policy" />
						</SelectTrigger>
						<SelectContent>
							<PolicySelectItems options={options} />
						</SelectContent>
					</Select>
					{options.length === 0 && (
						<p className="text-[11px] text-muted-foreground">
							No policy this scope may use.
						</p>
					)}
					{policyError && (
						<p id={ERROR_ID} className="text-[11px] text-destructive">
							{policyError}
						</p>
					)}
					{sharedNote && (
						<p className="text-[11px] text-muted-foreground">{sharedNote}</p>
					)}
				</form>

				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={onClose}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form="attach-policy"
						variant="cta"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Saving…" : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
