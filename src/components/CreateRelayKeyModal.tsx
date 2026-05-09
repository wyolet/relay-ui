import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import {
	emptyRelayKeyDraft,
	RelayKeyForm,
} from "@/components/RelayKeyForm";
import { toast } from "@/components/Toast";
import { type RelayKeyDraft, useKeysStore } from "@/stores/keys";

interface CreateRelayKeyModalProps {
	open: boolean;
	onClose: () => void;
}

export function CreateRelayKeyModal({
	open,
	onClose,
}: CreateRelayKeyModalProps) {
	const createKey = useKeysStore((s) => s.createKey);
	const clearSecret = useKeysStore((s) => s.clearSecret);
	const freshSecrets = useKeysStore((s) => s.freshSecrets);

	const [draft, setDraft] = useState<RelayKeyDraft>(emptyRelayKeyDraft());
	const [createdId, setCreatedId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const secret = createdId !== null ? freshSecrets[createdId] : undefined;

	function handleClose() {
		if (createdId !== null) {
			clearSecret(createdId);
			setCreatedId(null);
		}
		setDraft(emptyRelayKeyDraft());
		setError(null);
		onClose();
	}

	function handleCreate() {
		const name = draft.name.trim();
		if (name.length === 0) {
			setError("Name is required");
			return;
		}
		setError(null);
		const { id } = createKey({ ...draft, name });
		setCreatedId(id);
	}

	if (createdId !== null && secret !== undefined) {
		return (
			<Modal open={open} onClose={handleClose} title="Key created" size="md">
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
						onClick={handleClose}
						className="h-9 px-4 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						I've saved it
					</button>
				</div>
			</Modal>
		);
	}

	return (
		<Modal open={open} onClose={handleClose} title="Create relay key" size="lg">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					handleCreate();
				}}
				className="flex flex-col gap-5"
			>
				<RelayKeyForm value={draft} onChange={setDraft} />
				{error && (
					<p className="text-[11px] text-destructive">{error}</p>
				)}
				<div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
					<button
						type="button"
						onClick={handleClose}
						className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted"
					>
						Cancel
					</button>
					<button
						type="submit"
						className="h-8 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white"
					>
						Generate
					</button>
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
			className="inline-flex items-center justify-center h-8 w-8 rounded-md text-neutral-500 hover:text-foreground hover:bg-muted transition-colors"
		>
			{copied ? (
				<Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />
			) : (
				<Copy className="w-4 h-4" />
			)}
		</button>
	);
}
