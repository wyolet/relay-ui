import type { GovernanceSection } from "@/api/hooks/governance";
import { SettingLink, SettingRow } from "@/settings/SettingRow";
import type { SettingsSectionId } from "@/settings/sections";
import { useAccessSettings } from "@/settings/useAccessSettings";
import { useDataSettings } from "@/settings/useDataSettings";
import {
	GOVERNANCE_ROWS,
	useGovernanceLevel,
} from "@/settings/useGovernanceLevel";
import { useSystemSettings } from "@/settings/useSystemSettings";
import { useTrafficSettings } from "@/settings/useTrafficSettings";
import { LineTable, SwitchCell } from "@/shared/LineGrid";
import { PermissionLevelSwitch } from "@/shared/PermissionLevelSwitch";

function Rows({ children }: { children: React.ReactNode }) {
	return <LineTable minWidth="min-w-[34rem]">{children}</LineTable>;
}

function AccessSection() {
	const s = useAccessSettings();
	return (
		<Rows>
			<SettingRow
				label="Personal accounts"
				hint="Each user gets their own account. Groups and users can override it."
				state={
					s.personalOn === undefined
						? undefined
						: s.personalOn
							? "Every user gets one"
							: "Off for everyone"
				}
				control={
					<SwitchCell
						checked={s.personalOn ?? false}
						onChange={s.setPersonalOn}
						disabled={s.personalOn === undefined || s.personalPending}
						label="Personal accounts"
					/>
				}
			/>
			<SettingRow
				label="SSO"
				hint="Operators sign in through your identity provider."
				state={s.sso}
				control={<SettingLink to="/settings/sso" />}
			/>
			<SettingRow
				label="SCIM provisioning"
				hint="An identity provider creates users and groups."
				state={s.scim}
				control={
					<SettingLink to="/settings/scim">
						{s.scim === "Off" ? "Set up" : "Edit"}
					</SettingLink>
				}
			/>
			<SettingRow
				label="Inference tokens"
				hint="Short-lived tokens signed by the relay."
				state={s.tokens}
				control={<SettingLink to="/settings/tokens" />}
			/>
		</Rows>
	);
}

function TrafficSection() {
	const s = useTrafficSettings();
	return (
		<Rows>
			<SettingRow
				label="Proxy mode"
				hint="Accept requests that bring their own upstream credentials."
				state={s.proxyOn === undefined ? undefined : s.proxyOn ? "On" : "Off"}
				control={
					<SwitchCell
						checked={s.proxyOn ?? false}
						onChange={s.setProxyOn}
						disabled={s.proxyOn === undefined || s.pending}
						label="Proxy mode"
					/>
				}
			/>
			<SettingRow
				label="Requests without a key"
				hint="Proxy requests that carry no relay key. Usage can't name a caller."
				state={
					s.unauthenticatedOn === undefined
						? undefined
						: s.unauthenticatedOn
							? "Allowed"
							: "A key is required"
				}
				control={
					<SwitchCell
						checked={s.unauthenticatedOn ?? false}
						onChange={s.setUnauthenticatedOn}
						disabled={!s.proxyOn || s.pending}
						label="Requests without a key"
					/>
				}
			/>
			<SettingRow
				label="API rate limits"
				hint="Throttles on the relay's own control and inference APIs."
				state={s.apiLimits}
				control={<SettingLink to="/settings/rate-limits" />}
			/>
		</Rows>
	);
}

function DataSection() {
	const s = useDataSettings();
	return (
		<Rows>
			<SettingRow
				label="Payload capture"
				hint="Keep request and response bodies for the Logs inspector."
				state={
					s.captureOn === undefined ? undefined : s.captureOn ? "On" : "Off"
				}
				control={
					<SwitchCell
						checked={s.captureOn ?? false}
						onChange={s.setCaptureOn}
						disabled={s.captureOn === undefined || s.pending}
						label="Payload capture"
					/>
				}
			/>
			<SettingRow
				label="Body size and storage"
				hint="How much of each body is kept, and where."
				state={s.bodyCap}
				control={<SettingLink to="/settings/payload-logging" />}
			/>
		</Rows>
	);
}

function GovernanceRow({
	section,
	label,
	hint,
}: {
	section: GovernanceSection;
	label: string;
	hint: string;
}) {
	const g = useGovernanceLevel(section, label);
	return (
		<SettingRow
			label={label}
			hint={hint}
			state={g.text}
			control={
				g.level && (
					<PermissionLevelSwitch
						value={g.level}
						onChange={g.setLevel}
						disabled={g.pending}
						ariaLabel={`Permission level for ${label}`}
					/>
				)
			}
		/>
	);
}

function GovernanceSettings() {
	return (
		<Rows>
			{GOVERNANCE_ROWS.map((r) => (
				<GovernanceRow key={r.section} {...r} />
			))}
		</Rows>
	);
}

function SystemSection() {
	const s = useSystemSettings();
	return (
		<Rows>
			<SettingRow
				label="License"
				hint="Unlocks custom roles and SSO."
				state={s.license}
				control={<SettingLink to="/settings/license" />}
			/>
			<SettingRow
				label="Relay"
				hint="The server this interface talks to."
				state={<span className="font-mono">{s.relayVersion}</span>}
			/>
			<SettingRow
				label="Interface"
				hint="This UI's build."
				state={<span className="font-mono">{s.uiVersion}</span>}
			/>
			{s.canReadAudit && (
				<SettingRow
					label="Audit log"
					hint="Every write to the relay's configuration, with its actor."
					state={null}
					control={<SettingLink to="/audit">Open</SettingLink>}
				/>
			)}
		</Rows>
	);
}

export const SECTION_VIEWS: Record<SettingsSectionId, () => React.JSX.Element> =
	{
		access: AccessSection,
		traffic: TrafficSection,
		data: DataSection,
		governance: GovernanceSettings,
		system: SystemSection,
	};
