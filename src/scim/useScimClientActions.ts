import { useState } from "react";
import {
	type IssuedScimClient,
	useRevokeScimClient,
	useRotateScimClient,
} from "@/api/hooks/scimClients";
import { ApiError } from "@/api/types/errors";
import { confirm } from "@/shared/ConfirmDialog";
import { toast } from "@/shared/Toast";

/** A token just issued, with what issued it, shown once and then dropped. */
export interface IssuedToken {
	client: IssuedScimClient;
	action: "created" | "rotated";
}

function errorMessage(err: unknown, fallback: string): string {
	return err instanceof ApiError ? err.body.message : fallback;
}

export function useScimClientActions() {
	const rotate = useRotateScimClient();
	const revoke = useRevokeScimClient();
	// The only place a token lives: component state, gone when the dialog closes.
	const [issued, setIssued] = useState<IssuedToken | null>(null);

	async function rotateClient(name: string) {
		const ok = await confirm({
			title: `Rotate the token of ${name}?`,
			description:
				"The current token stops working at once. Put the new one in the identity provider, or provisioning fails until you do. The users and groups this client provisioned stay its own.",
			confirmLabel: "Rotate",
		});
		if (!ok) return;
		try {
			const client = await rotate.mutateAsync(name);
			rotate.reset();
			setIssued({ client, action: "rotated" });
		} catch (err) {
			toast("error", errorMessage(err, "Failed to rotate the token."));
		}
	}

	async function revokeClient(name: string) {
		const ok = await confirm({
			title: `Revoke ${name}?`,
			description:
				"This is permanent. The token stops working at once and the client is never issued a token again, and its name can't be reused. The users and groups it provisioned stay, and no client can change them.",
			confirmLabel: "Revoke",
			danger: true,
		});
		if (!ok) return;
		try {
			await revoke.mutateAsync(name);
			toast("success", `SCIM client "${name}" revoked.`);
		} catch (err) {
			toast("error", errorMessage(err, "Failed to revoke the client."));
		}
	}

	return {
		issued,
		showIssued: (client: IssuedScimClient) =>
			setIssued({ client, action: "created" }),
		dismissIssued: () => setIssued(null),
		rotateClient: (name: string) => void rotateClient(name),
		revokeClient: (name: string) => void revokeClient(name),
		busy: rotate.isPending || revoke.isPending,
	};
}
