import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, RotateCw, ShieldOff } from "lucide-react";
import { useAuth } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/shared/AlertBanner";
import { SettingsPageHeader } from "@/shared/SettingsPage";
import { SettingsSection } from "@/shared/SettingsSection";
import { useRotateSigningKey } from "@/tokens/useRotateSigningKey";

export const Route = createFileRoute("/_authenticated/settings/tokens")({
	component: TokenSettingsPage,
});

// Rotating the signing key is an operator action: the UI offers it to admins
// only, as it does every relay-wide security operation.
function TokenSettingsPage() {
	const { isAdmin } = useAuth();
	const { rotate, rotating, unavailable } = useRotateSigningKey();

	return (
		<div className="flex flex-col">
			<SettingsPageHeader title="Inference tokens">
				Short-lived bearer tokens minted for one project from the account menu.
				Relay signs them with a key kept in the{" "}
				<code className="font-mono">auth:tokens</code> section.
			</SettingsPageHeader>

			{!isAdmin && (
				<AlertBanner
					className="mt-4"
					severity="info"
					title="Only an admin can rotate the signing key"
				/>
			)}

			{unavailable && (
				<AlertBanner
					className="mt-4"
					severity="warn"
					title="Inference tokens aren't configured on this relay"
				>
					<p className="text-xs text-muted-foreground">{unavailable}</p>
				</AlertBanner>
			)}

			<div className="mt-6 divide-y divide-border">
				<SettingsSection
					icon={KeyRound}
					title="Signing key"
					description="Rotate to sign new tokens with a fresh key. The outgoing key stays on the verifier, so tokens already minted keep working until they expire."
				>
					{isAdmin && (
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={rotate}
							disabled={rotating}
						>
							<RotateCw className="size-3.5" />
							{rotating ? "Rotating…" : "Rotate signing key"}
						</Button>
					)}
				</SettingsSection>

				<SettingsSection
					icon={ShieldOff}
					title="Revoking tokens"
					description="Rotation revokes nothing. Revoking is a separate action that makes tokens stop verifying at once."
				>
					<ul className="flex list-disc flex-col gap-1.5 pl-4 text-xs text-muted-foreground">
						<li>
							One user's tokens:{" "}
							{isAdmin ? (
								<Link to="/users" className="underline hover:text-foreground">
									Revoke all tokens on their user page
								</Link>
							) : (
								"Revoke all tokens on their user page, as an admin"
							)}
							.
						</li>
						<li>
							Your own tokens: Revoke all my tokens, under Inference tokens in
							the account menu.
						</li>
					</ul>
				</SettingsSection>
			</div>
		</div>
	);
}
