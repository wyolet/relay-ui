import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { AlertBanner } from "@/shared/AlertBanner";
import { CopyableValue } from "@/shared/CopyableValue";
import type { IssuedToken } from "./useScimClientActions";
import { SCIM_BASE_URL } from "./useScimStatus";

export function ScimTokenDialog({
	issued,
	onClose,
}: {
	issued: IssuedToken;
	onClose: () => void;
}) {
	const { client, action } = issued;
	return (
		<Dialog open onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{action === "created" ? "Client created" : "Token rotated"}:{" "}
						<span className="font-mono">{client.name}</span>
					</DialogTitle>
					<DialogDescription>
						Configure the identity provider with this base URL and the token as
						its bearer token.
					</DialogDescription>
				</DialogHeader>

				<AlertBanner
					severity="warn"
					title="Copy the token now — you won't see it again"
				>
					<p className="text-xs text-muted-foreground">
						Relay keeps only its hash. If it's lost, rotate the token.
					</p>
				</AlertBanner>

				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
							Token
						</span>
						<CopyableValue value={client.token} copyLabel="Copy token" />
					</div>
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
							Base URL
						</span>
						<CopyableValue value={SCIM_BASE_URL} copyLabel="Copy base URL" />
					</div>
				</div>

				<DialogFooter>
					<Button type="button" onClick={onClose}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
