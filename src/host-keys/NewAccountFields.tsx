import { useId } from "react";
import { Input } from "@/components/ui/input";
import { HostSelect } from "@/hosts/HostSelect";

const labelClass =
	"text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1";

/** Host, name and org id of the provider account created with the key. */
export function NewAccountFields({
	hostId,
	hostOptions,
	onHostChange,
	hostError,
	name,
	onNameChange,
	nameError,
	slugPreview,
	orgId,
	onOrgIdChange,
	orgIdError,
}: {
	hostId: string;
	hostOptions: readonly { value: string; label: string }[];
	onHostChange: (hostId: string) => void;
	hostError?: string;
	name: string;
	onNameChange: (name: string) => void;
	nameError?: string;
	slugPreview: string;
	orgId: string;
	onOrgIdChange: (orgId: string) => void;
	orgIdError?: string;
}) {
	const nameErrorId = useId();
	const orgIdErrorId = useId();
	return (
		<div className="flex flex-col gap-4 rounded-md border border-border p-4 max-w-md">
			<HostSelect
				value={hostId}
				options={hostOptions}
				onChange={onHostChange}
				error={hostError}
			/>
			<div>
				<div className={labelClass}>Account name</div>
				<Input
					type="text"
					value={name}
					onChange={(e) => onNameChange(e.currentTarget.value)}
					placeholder="Anthropic"
					className="w-full"
					aria-label="Account name"
					aria-invalid={nameError ? true : undefined}
					aria-describedby={nameError ? nameErrorId : undefined}
				/>
				{nameError ? (
					<p id={nameErrorId} className="mt-1.5 text-[11px] text-destructive">
						{nameError}
					</p>
				) : (
					slugPreview && (
						<p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
							{slugPreview}
						</p>
					)
				)}
			</div>
			<div>
				<div className={labelClass}>Organization id (optional)</div>
				<Input
					type="text"
					value={orgId}
					onChange={(e) => onOrgIdChange(e.currentTarget.value)}
					placeholder="org-…"
					className="w-full font-mono"
					aria-label="Organization id"
					aria-invalid={orgIdError ? true : undefined}
					aria-describedby={orgIdError ? orgIdErrorId : undefined}
				/>
				{orgIdError && (
					<p id={orgIdErrorId} className="mt-1.5 text-[11px] text-destructive">
						{orgIdError}
					</p>
				)}
			</div>
		</div>
	);
}
