import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RelayKeyForm } from "@/components/RelayKeyForm";
import { toast } from "@/components/Toast";
import { useCreateRelayKeyForm } from "@/components/useCreateRelayKeyForm";

interface CreateRelayKeyModalProps {
	open: boolean;
	onClose: () => void;
}

export function CreateRelayKeyModal({
	open,
	onClose,
}: CreateRelayKeyModalProps) {
	const { form, values, nameError, createdId, secret, setDraft } =
		useCreateRelayKeyForm({ open });

	if (createdId !== null && secret !== undefined) {
		return (
			<Modal open={open} onClose={onClose} title="Key created" size="md">
				<p className="text-sm text-muted-foreground mb-3">
					Copy this now — it won't be shown again.
				</p>
				<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 mb-5">
					<code className="flex-1 text-xs font-mono text-foreground truncate">
						{secret}
					</code>
					<CopyInline text={secret} />
				</div>
				<div className="flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-sm font-semibold text-primary-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						I've saved it
					</button>
				</div>
			</Modal>
		);
	}

	return (
		<Modal open={open} onClose={onClose} title="Create relay key" size="lg">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="flex flex-col gap-5"
			>
				<RelayKeyForm
					value={values}
					onChange={setDraft}
					nameError={nameError}
				/>
				<div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
					<button
						type="button"
						onClick={onClose}
						className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted"
					>
						Cancel
					</button>
					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<button
								type="submit"
								disabled={isSubmitting}
								className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground disabled:opacity-50"
							>
								Generate
							</button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</Modal>
	);
}

function CopyInline({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1_500);
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}
	return (
		<button
			type="button"
			onClick={() => void handleCopy()}
			aria-label="Copy"
			className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
		>
			{copied ? (
				<Check className="w-4 h-4 text-primary" />
			) : (
				<Copy className="w-4 h-4" />
			)}
		</button>
	);
}
