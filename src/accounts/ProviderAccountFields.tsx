import { useId } from "react";
import { Input } from "@/components/ui/input";
import { HostSelect } from "@/hosts/HostSelect";

/** Host and organization id of a provider account. */
export function ProviderAccountFields({
	hostId,
	hostOptions,
	onHostChange,
	hostError,
	hostLocked,
	orgId,
	onOrgIdChange,
	orgIdError,
}: {
	hostId: string;
	hostOptions: readonly { value: string; label: string }[];
	onHostChange: (hostId: string) => void;
	hostError?: string;
	/** Set on edit: the account's keys are at its host. */
	hostLocked: boolean;
	orgId: string;
	onOrgIdChange: (orgId: string) => void;
	orgIdError?: string;
}) {
	const orgErrorId = useId();
	return (
		<div className="flex flex-col gap-4">
			<HostSelect
				value={hostId}
				options={hostOptions}
				onChange={onHostChange}
				error={hostError}
				disabled={hostLocked}
				hint={
					hostLocked
						? "Fixed once created: the account's keys are at this host."
						: undefined
				}
			/>
			<div>
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
					Organization id
				</div>
				<Input
					type="text"
					value={orgId}
					onChange={(e) => onOrgIdChange(e.currentTarget.value)}
					placeholder="org-…"
					className="font-mono w-full max-w-md"
					aria-label="Organization id"
					aria-invalid={orgIdError ? true : undefined}
					aria-describedby={orgIdError ? orgErrorId : undefined}
				/>
				{orgIdError ? (
					<p id={orgErrorId} className="mt-1.5 text-[11px] text-destructive">
						{orgIdError}
					</p>
				) : (
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						The provider's organization id, never a person or an email. Leave
						empty until known.
					</p>
				)}
			</div>
		</div>
	);
}
