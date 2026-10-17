import { Link } from "@tanstack/react-router";
import { Fingerprint, Network, UserX } from "lucide-react";
import type { AuthSCIMEnvelope } from "@/api/hooks/settings";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertBanner } from "@/shared/AlertBanner";
import { CopyableValue } from "@/shared/CopyableValue";
import { SettingsPageHeader, SettingsSaveBar } from "@/shared/SettingsPage";
import { SettingsSection } from "@/shared/SettingsSection";
import {
	isLinkClaim,
	LINK_CLAIMS,
	useScimSettingsForm,
} from "./useScimSettingsForm";
import { SCIM_BASE_URL } from "./useScimStatus";

export function ScimSettingsForm({
	envelope,
	readOnly = false,
}: {
	envelope: AuthSCIMEnvelope;
	readOnly?: boolean;
}) {
	const form = useScimSettingsForm(envelope);
	const { values } = form;

	return (
		<div className="flex flex-col">
			<SettingsPageHeader title="SCIM provisioning">
				Let an identity provider such as Microsoft Entra ID or Okta create,
				update and deactivate users and groups. Each provider authenticates with
				the token of a SCIM client.
			</SettingsPageHeader>

			{readOnly && (
				<AlertBanner
					className="mt-4"
					severity="info"
					title="Only an admin can change SCIM settings"
				/>
			)}

			<div className="mt-6 divide-y divide-border">
				<SettingsSection
					icon={Network}
					title="Enable provisioning"
					description="Off by default. While off, /scim/v2 answers 404 and every client token does nothing."
				>
					<div className="flex flex-col gap-3 max-w-xl">
						<div className="inline-flex items-center gap-2.5">
							<Switch
								checked={values.enabled}
								onCheckedChange={form.setEnabled}
								disabled={readOnly}
								aria-label="Enable SCIM provisioning"
							/>
							<span className="text-sm text-foreground">
								{values.enabled ? "Enabled" : "Disabled"}
							</span>
						</div>
						<div className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Base URL for the identity provider
							</span>
							<CopyableValue value={SCIM_BASE_URL} copyLabel="Copy base URL" />
						</div>
						{!readOnly && (
							<Link
								to="/scim-clients"
								className="text-xs text-muted-foreground underline hover:text-foreground"
							>
								Manage SCIM clients
							</Link>
						)}
					</div>
				</SettingsSection>

				<SettingsSection
					icon={UserX}
					title="User deletes"
					description="A SCIM DELETE of a user deletes the account. Disable it instead to keep its bindings and audit history."
				>
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={values.deleteDisables}
							onCheckedChange={form.setDeleteDisables}
							disabled={readOnly}
							aria-label="Disable users instead of deleting them"
						/>
						<span className="text-sm text-foreground">
							{values.deleteDisables ? "Disable instead" : "Delete"}
						</span>
					</div>
				</SettingsSection>

				<SettingsSection
					icon={Fingerprint}
					title="Sign-in link claim"
					description="The ID-token claim a first OIDC sign-in is matched on against a provisioned account's externalId. Only stable provider ids are accepted: a claim the user can edit could link them to someone else's account."
				>
					<Select
						value={values.linkClaim}
						items={[...LINK_CLAIMS]}
						onValueChange={(v) => isLinkClaim(v) && form.setLinkClaim(v)}
						disabled={readOnly}
					>
						<SelectTrigger
							className="w-full max-w-md"
							aria-label="Sign-in link claim"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{LINK_CLAIMS.map((c) => (
								<SelectItem key={c.value} value={c.value}>
									{c.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingsSection>
			</div>

			{!readOnly && (
				<SettingsSaveBar
					onReset={form.reset}
					onSave={form.save}
					saving={form.saving}
				/>
			)}
		</div>
	);
}
