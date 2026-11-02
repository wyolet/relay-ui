import { partyKindLabel, RECEIVER_KINDS } from "@/accounts/sharing";
import { useShareAccountForm } from "@/accounts/useShareAccountForm";
import type { Account } from "@/api/hooks/accounts";
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
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";
import { Segmented } from "@/shared/Segmented";

const KIND_OPTIONS = RECEIVER_KINDS.map((k) => ({
	value: k,
	label: partyKindLabel(k),
}));

const ERROR_ID = "share-receiver-error";

/** Picks a receiver and shares the provider account with it. */
export function ShareAccountDialog({
	account,
	onClose,
}: {
	account: Account;
	onClose: () => void;
}) {
	const {
		form,
		values,
		options,
		receiverError,
		isSubmitting,
		setKind,
		setReceiver,
	} = useShareAccountForm(account, onClose);
	const kindLabel = partyKindLabel(values.kind).toLowerCase();

	return (
		<Dialog open onOpenChange={(next) => !next && !isSubmitting && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share "{displayLabel(account.metadata)}"</DialogTitle>
					<DialogDescription>
						The receiver gets a shared account that uses this account's keys,
						never their secrets. Its requests count on this account's limits.
					</DialogDescription>
				</DialogHeader>

				<form
					id="share-account"
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="flex flex-col gap-3"
				>
					<Segmented
						options={KIND_OPTIONS}
						value={values.kind}
						onChange={setKind}
					/>
					<div className="flex flex-col gap-1.5">
						<Select
							value={values.receiverId || null}
							items={options}
							onValueChange={(v) => v && setReceiver(v)}
						>
							<SelectTrigger
								className="w-full"
								aria-label={`Share with ${kindLabel}`}
								aria-invalid={receiverError ? true : undefined}
								aria-describedby={receiverError ? ERROR_ID : undefined}
							>
								<SelectValue placeholder={`Pick a ${kindLabel}`} />
							</SelectTrigger>
							<SelectContent>
								{options.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{options.length === 0 && (
							<p className="text-[11px] text-muted-foreground">
								No {kindLabel} you can see.
							</p>
						)}
						{receiverError && (
							<p id={ERROR_ID} className="text-[11px] text-destructive">
								{receiverError}
							</p>
						)}
					</div>
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
						form="share-account"
						variant="cta"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Sharing…" : "Share"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
