import { CalendarClock, ToggleLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/shared/FormSection";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

export interface KeySettings {
	/** Date from the `<input type="date">`; "" never expires. */
	expiresAt: string;
	passthroughAllowed: boolean;
	payloadLoggingEnabled: boolean;
}

/** The expiry and request-time flags of a relay key, as form sections. */
export function KeySettingsSections({
	settings,
	onExpiresAtChange,
	onPassthroughAllowedChange,
	onPayloadLoggingEnabledChange,
}: {
	settings: KeySettings;
	onExpiresAtChange: (value: string) => void;
	onPassthroughAllowedChange: (value: boolean) => void;
	onPayloadLoggingEnabledChange: (value: boolean) => void;
}) {
	return (
		<>
			<FormSection
				icon={CalendarClock}
				title="Expiry"
				description="After this date the key stops authenticating. Leave empty for a key that never expires."
			>
				<Input
					type="date"
					className="w-full max-w-xs"
					value={settings.expiresAt}
					onChange={(e) => onExpiresAtChange(e.target.value)}
					aria-label="Expiry date"
				/>
			</FormSection>

			<FormSection
				icon={ToggleLeft}
				title="Behavior"
				description="Operational flags applied at request time."
			>
				<ToggleSwitch
					value={settings.passthroughAllowed}
					onChange={onPassthroughAllowedChange}
					label="Allow upstream passthrough"
					hint="Permits the caller to forward their own provider API key instead of using the relay's host keys."
				/>
				<ToggleSwitch
					value={settings.payloadLoggingEnabled}
					onChange={onPayloadLoggingEnabledChange}
					label="Capture request & response payloads"
					hint="Logs full request/response bodies for this key's traffic (visible under Logs). An account on the request's ladder that sets payload logging decides instead."
				/>
			</FormSection>
		</>
	);
}
