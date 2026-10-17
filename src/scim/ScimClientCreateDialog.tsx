import type { IssuedScimClient, ScimClient } from "@/api/hooks/scimClients";
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
import { Label } from "@/components/ui/label";
import { useCreateScimClientForm } from "./useCreateScimClientForm";

interface ScimClientCreateDialogProps {
	clients: readonly ScimClient[];
	onClose: () => void;
	onCreated: (issued: IssuedScimClient) => void;
}

export function ScimClientCreateDialog({
	clients,
	onClose,
	onCreated,
}: ScimClientCreateDialogProps) {
	const { name, error, submitting, setName, submit } = useCreateScimClientForm({
		clients,
		onCreated,
	});

	return (
		<Dialog open onOpenChange={(next) => !next && !submitting && onClose()}>
			<DialogContent className="sm:max-w-md">
				<form
					className="flex flex-col gap-4"
					onSubmit={(e) => {
						e.preventDefault();
						submit();
					}}
				>
					<DialogHeader>
						<DialogTitle>New SCIM client</DialogTitle>
						<DialogDescription>
							One client per identity provider. Its token is shown once, right
							after you create it.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="scim-client-name">Name</Label>
						<Input
							id="scim-client-name"
							value={name}
							placeholder="entra"
							spellCheck={false}
							autoComplete="off"
							autoFocus
							onChange={(e) => setName(e.currentTarget.value)}
							aria-invalid={error ? true : undefined}
							aria-describedby={
								error ? "scim-client-name-error" : "scim-client-name-hint"
							}
						/>
						{error ? (
							<p
								id="scim-client-name-error"
								className="text-[11px] text-destructive"
							>
								{error}
							</p>
						) : (
							<p
								id="scim-client-name-hint"
								className="text-[11px] text-muted-foreground"
							>
								A lowercase label such as entra or okta. Users and groups the
								client provisions carry it, so a name is issued once and never
								reused after a revoke.
							</p>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={onClose}
							disabled={submitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting}>
							{submitting ? "Creating…" : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
