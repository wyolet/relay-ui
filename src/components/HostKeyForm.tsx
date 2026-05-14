import { KeyRound } from "lucide-react";
import type { HostKey, HostKeyKind } from "@/api/types/hostkey";
import { FormSection } from "@/components/FormSection";
import { IdentitySection } from "@/components/IdentitySection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useHostKeyForm } from "@/components/useHostKeyForm";

const KIND_OPTIONS: Record<HostKeyKind, { label: string; hint: string }> = {
	stored: {
		label: "Stored value",
		hint: "Relay encrypts and stores the secret. Use for keys you paste directly into the UI.",
	},
	env: {
		label: "Environment variable",
		hint: "Relay reads the secret from this env var on the deployment at request time.",
	},
};

interface HostKeyFormProps {
	hostKey?: HostKey;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function HostKeyForm({ hostKey, onSaved, onCancel }: HostKeyFormProps) {
	const {
		form,
		values,
		isEdit,
		originalKind,
		slugPreview,
		displayNameError,
		descriptionError,
		envVarError,
		valueError,
		needsValueOnEdit,
	} = useHostKeyForm({ open: true, hostKey, onSaved });

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="flex flex-col"
		>
			<div className="divide-y divide-border">
				<IdentitySection
					displayName={values.displayName}
					description={values.description}
					onDisplayNameChange={(v) => form.setFieldValue("displayName", v)}
					onDescriptionChange={(v) => form.setFieldValue("description", v)}
					slugPreview={slugPreview}
					displayNameError={displayNameError}
					descriptionError={descriptionError}
					autoFocus={!isEdit}
					placeholder="OpenAI production key"
				/>

				<FormSection
					icon={KeyRound}
					title="Source"
					description="Where Relay reads the credential from at request time."
				>
					<div className="flex flex-col gap-4">
						<div>
							<Select
								value={values.kind}
								onValueChange={(v) =>
									form.setFieldValue("kind", v as HostKeyKind)
								}
							>
								<SelectTrigger className="w-full max-w-md">
									<SelectValue>{KIND_OPTIONS[values.kind].label}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{(Object.keys(KIND_OPTIONS) as HostKeyKind[]).map((k) => (
										<SelectItem key={k} value={k}>
											<span className="flex flex-col items-start gap-0.5 whitespace-normal">
												<span className="text-sm text-foreground">
													{KIND_OPTIONS[k].label}
												</span>
												<span className="text-[11px] leading-snug text-muted-foreground">
													{KIND_OPTIONS[k].hint}
												</span>
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="mt-1.5 text-[11px] text-muted-foreground">
								{KIND_OPTIONS[values.kind].hint}
							</p>
						</div>

						{values.kind === "env" && (
							<div>
								<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
									Environment variable
								</div>
								<Input
									type="text"
									value={values.envVar}
									onChange={(e) =>
										form.setFieldValue("envVar", e.currentTarget.value)
									}
									placeholder="OPENAI_API_KEY"
									className="font-mono w-full max-w-md"
									aria-invalid={envVarError ? true : undefined}
								/>
								{envVarError && (
									<p className="mt-1.5 text-[11px] text-destructive">
										{envVarError}
									</p>
								)}
								<p className="mt-1.5 text-[11px] text-muted-foreground">
									Set this env var on your relay deployment.
								</p>
							</div>
						)}

						{values.kind === "stored" && (
							<div>
								<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
									{isEdit
										? needsValueOnEdit
											? "Secret value"
											: "New secret value (optional)"
										: "Secret value"}
								</div>
								<Input
									type="password"
									autoComplete="new-password"
									value={values.value}
									onChange={(e) =>
										form.setFieldValue("value", e.currentTarget.value)
									}
									placeholder={
										isEdit && !needsValueOnEdit
											? "Leave blank to keep current value"
											: "sk-…"
									}
									className="w-full max-w-md"
									aria-invalid={valueError ? true : undefined}
								/>
								{valueError && (
									<p className="mt-1.5 text-[11px] text-destructive">
										{valueError}
									</p>
								)}
								{isEdit && originalKind === "stored" && (
									<p className="mt-1.5 text-[11px] text-muted-foreground">
										Rotation also available from the detail page.
									</p>
								)}
							</div>
						)}
					</div>
				</FormSection>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
