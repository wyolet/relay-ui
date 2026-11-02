import { useDeleteHostKey } from "@/api/hooks/hostkeys";
import type { HostKey } from "@/api/types/hostkey";
import { displayLabel } from "@/lib/displayLabel";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

/** The typed-confirm credential delete, refused up front while a policy reaches the key. */
export function useHostKeyDelete({ onDeleted }: { onDeleted?: () => void }) {
	const del = useConfirmedDelete(useDeleteHostKey(), {
		noun: "credential",
		onDeleted,
	});

	function request(hk: HostKey) {
		const refs = hk.policies ?? [];
		if (refs.length > 0) {
			const preview = refs
				.slice(0, 3)
				.map((r) => r.name)
				.join(", ");
			const overflow = refs.length > 3 ? ` (+${refs.length - 3} more)` : "";
			toast(
				"error",
				`Remove it from its pools first; ${refs.length} ${
					refs.length === 1 ? "policy reaches" : "policies reach"
				} it: ${preview}${overflow}.`,
			);
			return;
		}
		del.request({
			id: hk.metadata.id ?? "",
			name: hk.metadata.name,
			label: displayLabel(hk.metadata),
		});
	}

	return { del, request };
}
