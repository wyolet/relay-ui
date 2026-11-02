import { Building2, CalendarClock, ToggleLeft, UserRound } from "lucide-react";
import { useAuth } from "@/api/auth";
import { useProjects } from "@/api/hooks/projects";
import { useServiceAccountsInProject } from "@/api/hooks/serviceAccounts";
import type { Key } from "@/api/types/key";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useKeyForm } from "@/keys/useKeyForm";
import { displayLabel } from "@/lib/displayLabel";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { Segmented } from "@/shared/Segmented";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface KeyFormProps {
	apiKey?: Key;
	onSaved: (savedName: string) => void;
	onCreated?: (plaintext: string) => void;
	onCancel: () => void;
}

export function KeyForm({
	apiKey,
	onSaved,
	onCreated,
	onCancel,
}: KeyFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		principalIdError,
		choosePrincipal,
		laneOptions,
		laneValue,
	} = useKeyForm({ open: true, apiKey, onSaved, onCreated });

	const { userId } = useAuth();
	const { data: projectsData } = useProjects();
	const { data: serviceAccountsData } = useServiceAccountsInProject(
		values.projectId,
	);
	const projectOptions = (projectsData.items ?? []).map((p) => ({
		value: p.metadata.id ?? "",
		label: displayLabel(p.metadata),
	}));
	const serviceAccountOptions = (serviceAccountsData?.items ?? []).map(
		(sa) => ({
			value: sa.metadata.id ?? "",
			label: displayLabel(sa.metadata),
		}),
	);

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
					placeholder="prod-app"
				/>

				<FormSection
					icon={UserRound}
					title="Principal"
					description="Who this key authenticates as — a service account in a project, or you. Fixed once the key exists."
				>
					{isEdit ? (
						<p className="text-xs text-foreground">
							{values.principalKind === "user" ? "User" : "Service account"}{" "}
							<code className="font-mono text-[11px] text-muted-foreground">
								{values.principalId}
							</code>
						</p>
					) : (
						<div className="flex flex-col gap-3">
							<Segmented
								options={[
									{ value: "serviceaccount", label: "Service account" },
									{ value: "user", label: "Me" },
								]}
								value={values.principalKind}
								onChange={(kind) =>
									choosePrincipal(kind, kind === "user" ? (userId ?? "") : "")
								}
							/>

							{values.principalKind === "serviceaccount" ? (
								<div className="flex flex-col gap-2">
									<Select
										value={values.projectId}
										items={projectOptions}
										onValueChange={(v) => {
											form.setFieldValue("projectId", v ?? "");
											choosePrincipal("serviceaccount", "");
										}}
									>
										<SelectTrigger className="w-full max-w-md">
											<SelectValue placeholder="Pick a project…" />
										</SelectTrigger>
										<SelectContent>
											{projectOptions.map((p) => (
												<SelectItem key={p.value} value={p.value}>
													{p.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Select
										value={values.principalId}
										items={serviceAccountOptions}
										onValueChange={(v) =>
											choosePrincipal("serviceaccount", v ?? "")
										}
									>
										<SelectTrigger
											className="w-full max-w-md"
											disabled={!values.projectId}
											aria-invalid={principalIdError ? true : undefined}
										>
											<SelectValue
												placeholder={
													values.projectId
														? "Pick a service account…"
														: "Pick a project first"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{serviceAccountOptions.map((a) => (
												<SelectItem key={a.value} value={a.value}>
													{a.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							) : (
								<p className="text-xs text-muted-foreground">
									The key authenticates as you —{" "}
									<code className="font-mono text-[11px]">{userId ?? "?"}</code>
								</p>
							)}
							{principalIdError && (
								<p className="text-[11px] text-destructive">
									{principalIdError}
								</p>
							)}
						</div>
					)}
				</FormSection>

				{!isEdit && (
					<FormSection
						icon={Building2}
						title="Account"
						description="The account the key's requests run in by default. A team or project membership account climbs that team's and project's policies; a personal or service account answers to its own policy only."
					>
						<Select
							value={laneValue}
							items={laneOptions}
							disabled={laneOptions.length === 0}
							onValueChange={(v) => form.setFieldValue("accountId", v ?? "")}
						>
							<SelectTrigger className="w-full max-w-md" aria-label="Account">
								<SelectValue
									placeholder={
										values.principalId
											? "The principal's default account"
											: "Pick a principal first"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{laneOptions.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormSection>
				)}

				<FormSection
					icon={CalendarClock}
					title="Expiry"
					description="After this date the key stops authenticating. Leave empty for a key that never expires."
				>
					<Input
						type="date"
						className="w-full max-w-xs"
						value={values.expiresAt}
						onChange={(e) => form.setFieldValue("expiresAt", e.target.value)}
						aria-label="Expiry date"
					/>
				</FormSection>

				<FormSection
					icon={ToggleLeft}
					title="Behavior"
					description="Operational flags applied at request time."
				>
					<ToggleSwitch
						value={values.passthroughAllowed}
						onChange={(v) => form.setFieldValue("passthroughAllowed", v)}
						label="Allow upstream passthrough"
						hint="Permits the caller to forward their own provider API key instead of using the relay's host keys."
					/>
					<ToggleSwitch
						value={values.payloadLoggingEnabled}
						onChange={(v) => form.setFieldValue("payloadLoggingEnabled", v)}
						label="Capture request & response payloads"
						hint="Logs full request/response bodies for this key's traffic (visible under Logs). An account on the request's ladder that sets payload logging decides instead."
					/>
				</FormSection>
			</div>

			<form.Subscribe selector={(s) => s.isSubmitting}>
				{(isSubmitting) => (
					<FormFooter
						isEdit={isEdit}
						isSubmitting={isSubmitting}
						onCancel={onCancel}
					/>
				)}
			</form.Subscribe>
		</form>
	);
}
