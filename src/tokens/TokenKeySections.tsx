import { Link } from "@tanstack/react-router";
import { KeyRound, RotateCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/shared/AlertBanner";
import { SettingsSection } from "@/shared/SettingsSection";
import { useRotateSigningKey } from "./useRotateSigningKey";

/** Signing-key rotation and where revoking lives. Rotating is an operator
 * action: the UI offers it to admins only, as it does every relay-wide
 * security operation. */
export function TokenKeySections({ isAdmin }: { isAdmin: boolean }) {
	const { rotate, rotating, unavailable } = useRotateSigningKey();

	return (
		<>
			<SettingsSection
				icon={KeyRound}
				title="Signing key"
				description="Rotate to sign new tokens with a fresh key. The outgoing key stays on the verifier, so tokens already minted keep working until they expire."
			>
				<div className="flex flex-col gap-3">
					{unavailable && (
						<AlertBanner
							severity="warn"
							title="Inference tokens aren't configured on this relay"
						>
							<p className="text-xs text-muted-foreground">{unavailable}</p>
						</AlertBanner>
					)}
					{isAdmin ? (
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={rotate}
							disabled={rotating}
							className="self-start"
						>
							<RotateCw className="size-3.5" />
							{rotating ? "Rotating…" : "Rotate signing key"}
						</Button>
					) : (
						<p className="text-xs text-muted-foreground">
							Only an admin can rotate the signing key.
						</p>
					)}
				</div>
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
						Your own tokens: Revoke all my tokens, under Inference tokens in the
						account menu.
					</li>
				</ul>
			</SettingsSection>
		</>
	);
}
