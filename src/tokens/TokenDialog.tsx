import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { useMintToken, useRevokeAllTokens } from "@/api/hooks/tokens";
import { ApiError } from "@/api/types/errors";
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
import { AlertBanner } from "@/shared/AlertBanner";
import { confirm } from "@/shared/ConfirmDialog";
import { SecretReveal } from "@/shared/SecretReveal";
import { Segmented } from "@/shared/Segmented";
import { toast } from "@/shared/Toast";

/** Lifetimes offered for a minted token, as the Go durations the server takes.
 * The relay's `auth:tokens` maxTTL may be lower — it says so on rejection. */
const TTL_OPTIONS = [
	{ value: "1h", label: "1 hour" },
	{ value: "8h", label: "8 hours" },
	{ value: "24h", label: "24 hours" },
] as const;

/**
 * Self-service inference tokens: mint one for a project, or drop every token
 * this account holds. The plaintext is shown once and never stored.
 */
export function TokenDialog({ onClose }: { onClose: () => void }) {
	const [projectId, setProjectId] = useState("");
	const [ttl, setTtl] = useState<string>("1h");
	const [token, setToken] = useState<string | null>(null);
	const [inlineError, setInlineError] = useState<string | undefined>();

	// Non-suspending: the account menu must never block on the project list.
	const { data: projectsData } = useQuery(projectsListQueryOptions);
	const mint = useMintToken();
	const revokeAll = useRevokeAllTokens();

	const projectOptions = (projectsData?.items ?? []).map((p) => ({
		value: p.metadata.id ?? "",
		label: displayLabel(p.metadata),
	}));

	async function handleMint() {
		setInlineError(undefined);
		try {
			const minted = await mint.mutateAsync({ project: projectId, ttl });
			setToken(minted.token);
		} catch (err) {
			setInlineError(
				err instanceof ApiError ? err.body.message : "Failed to mint a token.",
			);
		}
	}

	async function handleRevokeAll() {
		const ok = await confirm({
			title: "Revoke all your tokens?",
			description:
				"Every inference token you hold stops verifying immediately. Anything still using one starts failing until it is replaced.",
			confirmLabel: "Revoke all",
			danger: true,
		});
		if (!ok) return;
		setInlineError(undefined);
		try {
			await revokeAll.mutateAsync();
			toast("success", "All your tokens were revoked.");
			onClose();
		} catch (err) {
			setInlineError(
				err instanceof ApiError ? err.body.message : "Failed to revoke tokens.",
			);
		}
	}

	const busy = mint.isPending || revokeAll.isPending;

	return (
		<Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Inference tokens</DialogTitle>
					<DialogDescription>
						{token
							? "Copy the token now — it won't be shown again."
							: "A short-lived bearer token for one project, minted for your account."}
					</DialogDescription>
				</DialogHeader>

				{inlineError && (
					<AlertBanner severity="error">{inlineError}</AlertBanner>
				)}

				{token ? (
					<SecretReveal secret={token} />
				) : (
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Project
							</span>
							<Select
								value={projectId}
								items={projectOptions}
								onValueChange={(v) => setProjectId(v ?? "")}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Pick a project…" />
								</SelectTrigger>
								<SelectContent>
									{projectOptions.map((p) => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Lifetime
							</span>
							<Segmented options={TTL_OPTIONS} value={ttl} onChange={setTtl} />
						</div>
					</div>
				)}

				<DialogFooter>
					{token ? (
						<Button type="button" onClick={onClose}>
							Done
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="ghost"
								onClick={() => void handleRevokeAll()}
								disabled={busy}
								className="mr-auto text-destructive"
							>
								{revokeAll.isPending ? "Revoking…" : "Revoke all my tokens"}
							</Button>
							<Button
								type="button"
								variant="ghost"
								onClick={onClose}
								disabled={busy}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={() => void handleMint()}
								disabled={busy || !projectId}
							>
								{mint.isPending ? "Minting…" : "Mint token"}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
