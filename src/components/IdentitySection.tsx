import { Tag } from "lucide-react";
import { FormSection } from "@/components/FormSection";
import { Input } from "@/components/ui/input";

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
}

export function IdentitySection({
	displayName,
	description,
	onDisplayNameChange,
	onDescriptionChange,
	slugPreview,
	displayNameError,
	descriptionError,
	autoFocus,
	placeholder = "My rate limit",
}: IdentitySectionProps) {
	return (
		<FormSection
			icon={Tag}
			title="Identity"
			description="A human-readable name for the UI. We generate a URL-safe slug from it on create."
		>
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
					</p>
				</div>
				<div>
					<textarea
						value={description}
						onChange={(e) => onDescriptionChange(e.currentTarget.value)}
						placeholder="Description (optional)…"
						rows={3}
						className="w-full min-w-0 rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-[color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
					/>
					{descriptionError && (
						<p className="mt-1.5 text-[11px] text-destructive">
							{descriptionError}
						</p>
					)}
				</div>
			</div>
		</FormSection>
	);
}
