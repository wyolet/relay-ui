import { ToggleLeft, Users } from "lucide-react";
import { useAuth } from "@/api/auth";
import type { Group } from "@/api/types/group";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGroupForm } from "@/groups/useGroupForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface GroupFormProps {
	group?: Group;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function GroupForm({ group, onSaved, onCancel }: GroupFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		memberCount,
		addMember,
	} = useGroupForm({ open: true, group, onSaved });
	const { userId } = useAuth();

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
					placeholder="data-science"
				/>

				<FormSection
					icon={Users}
					title="Members"
					description="User ids, one per line. The relay has no users list endpoint yet, so ids are entered by hand."
				>
					<div className="flex flex-col gap-2">
						<Textarea
							rows={6}
							value={values.memberIds}
							onChange={(e) => form.setFieldValue("memberIds", e.target.value)}
							placeholder="019200aa-…"
							aria-label="Member user ids"
						/>
						<div className="flex items-center justify-between gap-3">
							<span className="text-[11px] text-muted-foreground">
								{memberCount} member{memberCount === 1 ? "" : "s"}
							</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!userId}
								onClick={() => userId && addMember(userId)}
							>
								Add me
							</Button>
						</div>
					</div>
				</FormSection>

				<FormSection
					icon={ToggleLeft}
					title="Behavior"
					description="A disabled group stops contributing membership at login."
				>
					<ToggleSwitch
						value={values.enabled}
						onChange={(v) => form.setFieldValue("enabled", v)}
						label="Enabled"
					/>
				</FormSection>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" variant="cta" disabled={isSubmitting}>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
