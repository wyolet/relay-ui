import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { RelayKeyForm } from "@/components/RelayKeyForm";
import { toast } from "@/components/Toast";
import { type ApiKey, type RelayKeyDraft, useKeysStore } from "@/stores/keys";

interface EditRelayKeyModalProps {
	open: boolean;
	onClose: () => void;
	keyItem: ApiKey | null;
}

function toDraft(k: ApiKey): RelayKeyDraft {
	return {
		name: k.name,
		expiresAt: k.expiresAt,
		rateLimit: k.rateLimit,
	};
}

export function EditRelayKeyModal({
	open,
	onClose,
	keyItem,
}: EditRelayKeyModalProps) {
	const updateKey = useKeysStore((s) => s.updateKey);
	const [draft, setDraft] = useState<RelayKeyDraft | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open && keyItem) {
			setDraft(toDraft(keyItem));
			setError(null);
		}
	}, [open, keyItem]);

	function handleSave() {
		if (!keyItem || !draft) return;
		const name = draft.name.trim();
		if (name.length === 0) {
			setError("Name is required");
			return;
		}
		updateKey(keyItem.id, { ...draft, name });
		toast("success", `"${name}" updated.`);
		onClose();
	}

	if (!keyItem || !draft) {
		return (
			<Modal open={open} onClose={onClose} title="Edit relay key" size="lg">
				<div className="text-xs text-muted-foreground">
					No key selected.
				</div>
			</Modal>
		);
	}

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={`Edit ${keyItem.name}`}
			size="lg"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					handleSave();
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
						onClick={onClose}
						className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted"
					>
						Cancel
					</button>
					<button
						type="submit"
						className="h-8 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white"
					>
						Save
					</button>
				</div>
			</form>
		</Modal>
	);
}
