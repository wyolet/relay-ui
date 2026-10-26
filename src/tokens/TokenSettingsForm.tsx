import { Database, Hourglass, Power } from "lucide-react";
import type { AuthTokensEnvelope } from "@/api/hooks/settings";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertBanner } from "@/shared/AlertBanner";
import { DurationInput } from "@/shared/DurationInput";
import { SettingsPageHeader, SettingsSaveBar } from "@/shared/SettingsPage";
import { SettingsSection } from "@/shared/SettingsSection";
import { TokenKeySections } from "./TokenKeySections";
import { useTokenSettingsForm } from "./useTokenSettingsForm";

export function TokenSettingsHeader() {
	return (
		<SettingsPageHeader title="Inference tokens">
			Short-lived bearer tokens a signed-in user mints for one project from the
			account menu. Relay signs them with a key it generates and rotates itself.
		</SettingsPageHeader>
	);
}

export function TokenSettingsForm({
	envelope,
	readOnly = false,
}: {
	envelope: AuthTokensEnvelope;
	readOnly?: boolean;
}) {
	const form = useTokenSettingsForm(envelope);
	const { values, errors } = form;

	return (
		<div className="flex flex-col">
			<TokenSettingsHeader />

			{readOnly && (
				<AlertBanner
					className="mt-4"
					severity="info"
					title="Only an admin can change inference token settings"
				/>
			)}

			<div className="mt-6 divide-y divide-border">
				<SettingsSection
					icon={Power}
					title="Allow tokens"
					description="While off, users can't mint tokens and tokens already minted stop verifying."
				>
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={values.enabled}
							onCheckedChange={form.setEnabled}
							disabled={readOnly}
							aria-label="Allow inference tokens"
						/>
						<span className="text-sm text-foreground">
							{values.enabled ? "Enabled" : "Disabled"}
						</span>
					</div>
				</SettingsSection>

				<SettingsSection
					icon={Hourglass}
					title="Lifetimes"
					description="The default applies when a mint names no lifetime; the maximum caps what a mint may ask for."
				>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Default
							</span>
							<DurationInput
								value={values.defaultTTL}
								onChange={form.setDefaultTTL}
								label="Default token lifetime"
								disabled={readOnly}
								error={errors.defaultTTL}
								errorId="token-default-ttl-error"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Maximum
							</span>
							<DurationInput
								value={values.maxTTL}
								onChange={form.setMaxTTL}
								label="Maximum token lifetime"
								disabled={readOnly}
								error={errors.maxTTL}
								errorId="token-max-ttl-error"
							/>
						</div>
					</div>
				</SettingsSection>

				<SettingsSection
					icon={Database}
					title="Verified-token cache"
					description="How many verified tokens each pod remembers so a repeat request skips the signature check. 0 uses the default of 10,000; a negative number turns the cache off."
				>
					<Input
						type="number"
						step={1}
						inputMode="numeric"
						value={values.verifyCacheSize}
						onChange={(e) =>
							form.setVerifyCacheSize(Math.trunc(Number(e.target.value) || 0))
						}
						disabled={readOnly}
						aria-label="Verified-token cache size"
						className="w-40 tabular-nums"
					/>
				</SettingsSection>

				<TokenKeySections isAdmin={!readOnly} />
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
