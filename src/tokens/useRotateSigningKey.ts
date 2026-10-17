import { useState } from "react";
import { useRotateTokenSigningKey } from "@/api/hooks/tokens";
import { ApiError } from "@/api/types/errors";
import { confirm } from "@/shared/ConfirmDialog";
import { toast } from "@/shared/Toast";

/**
 * Confirm-then-rotate for the inference-token signing key. A 503 is a state of
 * the relay (no signing-key store), not a failed attempt, so it stays inline.
 */
export function useRotateSigningKey() {
	const rotate = useRotateTokenSigningKey();
	const [unavailable, setUnavailable] = useState<string | undefined>();

	async function rotateKey() {
		const ok = await confirm({
			title: "Rotate the token signing key?",
			description:
				"New inference tokens are signed with a fresh key. The outgoing key stays on the verifier, so tokens already minted keep working until they expire: rotating revokes nothing. To cut tokens off now, revoke them instead.",
			confirmLabel: "Rotate key",
		});
		if (!ok) return;
		try {
			await rotate.mutateAsync();
			setUnavailable(undefined);
			toast("success", "Signing key rotated. New tokens use the new key.");
		} catch (err) {
			if (err instanceof ApiError && err.status === 503) {
				setUnavailable(err.body.message);
				return;
			}
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to rotate the signing key.",
			);
		}
	}

	return {
		rotate: () => void rotateKey(),
		rotating: rotate.isPending,
		unavailable,
	};
}
