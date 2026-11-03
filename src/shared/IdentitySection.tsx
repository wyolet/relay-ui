import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormPlacement } from "@/lib/workContext";
import { FormSection } from "@/shared/FormSection";
import { WorkspaceMenu } from "@/shared/WorkspaceMenu";

function PlacementText({ placement }: { placement: FormPlacement }) {
	if (!placement.editable) return <span> · In {placement.scope}</span>;
	return (
		<span>
			{" · "}Creating in{" "}
			<span className="font-medium text-foreground">{placement.scope}</span>
			{" · "}
			<WorkspaceMenu
				aria-label="Change where this is created"
				trigger={<Button variant="link" size="inline" />}
				{...(placement.choose && placement.contextKey !== undefined
					? {
							formPick: {
								value: placement.contextKey,
								onSelect: placement.choose,
							},
						}
					: {})}
			>
				change
			</WorkspaceMenu>
		</span>
	);
}

interface IdentitySectionProps {
	displayName: string;
	description: string;
	onDisplayNameChange: (v: string) => void;
	onDescriptionChange: (v: string) => void;
	/** Final slug to show under the name field — owned by the form hook. */
	slugPreview: string;
	displayNameError?: string;
	descriptionError?: string;
	autoFocus?: boolean;
	placeholder?: string;
	/** Where the row sits; a create placed by the work context offers a switch. */
	placement?: FormPlacement;
	/** Why the server refused the row's owner. */
	placementError?: string;
}

export function IdentitySection(props: IdentitySectionProps) {
	return (
		<FormSection
			icon={Tag}
			title="Identity"
			description="A human-readable name for the UI. We generate a URL-safe slug from it on create."
		>
			<IdentityFields {...props} />
		</FormSection>
	);
}

/** The name, slug preview and description inputs, without the section chrome. */
export function IdentityFields({
	displayName,
	description,
	onDisplayNameChange,
	onDescriptionChange,
	slugPreview,
	displayNameError,
	descriptionError,
	autoFocus,
	placeholder = "My rate limit",
	placement,
	placementError,
}: IdentitySectionProps) {
	return (
		<div className="flex flex-col gap-3">
			<div>
				<Input
					type="text"
					value={displayName}
					onChange={(e) => onDisplayNameChange(e.currentTarget.value)}
					placeholder={placeholder}
					aria-invalid={displayNameError ? true : undefined}
					autoFocus={autoFocus}
				/>
				{displayNameError && (
					<p className="mt-1.5 text-[11px] text-destructive">
						{displayNameError}
					</p>
				)}
				<p className="mt-1.5 text-[11px] text-muted-foreground">
					Slug:{" "}
					<code className="font-mono text-foreground/80">
						{slugPreview || "—"}
					</code>
					{placement && <PlacementText placement={placement} />}
				</p>
				{placementError && (
					<p className="mt-1.5 text-[11px] text-destructive">
						{placementError}
					</p>
				)}
			</div>
			<div>
				<Textarea
					value={description}
					onChange={(e) => onDescriptionChange(e.currentTarget.value)}
					placeholder="Description (optional)…"
					rows={3}
					aria-invalid={descriptionError ? true : undefined}
				/>
				{descriptionError && (
					<p className="mt-1.5 text-[11px] text-destructive">
						{descriptionError}
					</p>
				)}
			</div>
		</div>
	);
}
