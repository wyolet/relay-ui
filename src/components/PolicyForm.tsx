/**
 * Two-column policy edit/create form, OpenRouter-styled.
 * Used by /policies/new and /policies/$name. Logic lives in usePolicyForm.
 */
import {
	Boxes,
	Gauge,
	KeyRound,
	type LucideIcon,
	Server,
	ShieldCheck,
	Tag,
} from "lucide-react";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import { useRateLimits } from "@/api/hooks/ratelimits";
import { useSecrets } from "@/api/hooks/secrets";
import type { Policy } from "@/api/types/policy";
import { MultiSelect } from "@/components/MultiSelect";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePolicyForm } from "@/components/usePolicyForm";

interface PolicyFormProps {
	/** Provided in edit mode; omit for create. */
	policy?: Policy;
	onSaved: () => void;
	onCancel: () => void;
}

export function PolicyForm({ policy, onSaved, onCancel }: PolicyFormProps) {
	const { data: providersData } = useProviders();
	const { data: secretsData } = useSecrets();
	const { data: modelsData } = useModels();
	const { data: rateLimitsData } = useRateLimits();

	const { form, values, isEdit, nameError, providerError } = usePolicyForm({
		open: true,
		policy,
		onSaved,
	});

	const providers = providersData.items ?? [];
	const allSecrets = secretsData.items ?? [];
	const allModels = modelsData.items ?? [];
	const allRateLimits = rateLimitsData.items ?? [];

	const providerModels = values.provider
		? allModels.filter((m) => m.spec.provider === values.provider)
		: allModels;

	const secretOptions = allSecrets.map((s) => ({
		value: s.name,
		label: s.name,
	}));
	const modelOptions = providerModels.map((m) => ({
		value: m.metadata.name,
		label: m.spec.displayName ?? m.metadata.name,
	}));
	const rateLimitOptions = allRateLimits.map((rl) => ({
		value: rl.metadata.name,
		label: rl.metadata.name,
	}));

	const modelsMode = values.models.length === 0 ? "all" : "specific";

	function setModelsMode(mode: "all" | "specific") {
		if (mode === "all") {
			form.setFieldValue("models", []);
		} else if (values.models.length === 0 && providerModels.length > 0) {
			// Pre-fill with first model so the picker shows a non-empty state
			// — user can immediately edit the selection.
			form.setFieldValue("models", []);
		}
	}

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
				{!isEdit && (
					<Section
						icon={Tag}
						title="Name"
						description="A slug used in URLs and references. Letters, digits, _ . - allowed."
					>
						<Input
							type="text"
							value={values.name}
							onChange={(e) =>
								form.setFieldValue("name", e.currentTarget.value)
							}
							placeholder="dev-policy"
							aria-invalid={nameError ? true : undefined}
							autoFocus
						/>
						{nameError && (
							<p className="mt-1.5 text-[11px] text-destructive">{nameError}</p>
						)}
					</Section>
				)}

				<Section
					icon={Server}
					title="Provider"
					description="The upstream this policy talks to. Locked after creation."
				>
					<p className="mb-2 text-sm text-muted-foreground">
						All credentials and models picked below are scoped to this provider.
					</p>
					<Select
						value={values.provider || undefined}
						onValueChange={(v) => form.setFieldValue("provider", v ?? "")}
						disabled={isEdit}
					>
						<SelectTrigger
							className="w-full max-w-md"
							aria-invalid={providerError ? true : undefined}
						>
							<SelectValue placeholder="Select a provider" />
						</SelectTrigger>
						<SelectContent>
							{providers.length === 0 ? (
								<div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
									No providers configured.
								</div>
							) : (
								providers.map((p) => (
									<SelectItem key={p.metadata.name} value={p.metadata.name}>
										{p.spec.displayName ?? p.metadata.name}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
					{providerError && (
						<p className="mt-1.5 text-[11px] text-destructive">
							{providerError}
						</p>
					)}
				</Section>

				<Section
					icon={Boxes}
					title="Allowed models"
					description="Restrict which models relay keys using this policy can call."
				>
					<p className="mb-2 text-sm text-muted-foreground">
						Leave on <strong className="text-foreground">All</strong> to permit
						every model the provider exposes, or switch to{" "}
						<strong className="text-foreground">Specific</strong> to whitelist.
					</p>
					<div className="flex items-center gap-3 mb-2">
						<Tabs
							value={modelsMode}
							onValueChange={(v) => setModelsMode(v as "all" | "specific")}
						>
							<TabsList>
								<TabsTrigger value="all">All</TabsTrigger>
								<TabsTrigger value="specific">Specific</TabsTrigger>
							</TabsList>
						</Tabs>
						<span className="text-[11px] text-muted-foreground tabular-nums">
							{providerModels.length} model
							{providerModels.length === 1 ? "" : "s"} on this provider
						</span>
					</div>
					{modelsMode === "specific" && (
						<MultiSelect
							options={modelOptions}
							selected={values.models}
							onChange={(next) => form.setFieldValue("models", next)}
							placeholder="Pick models…"
							emptyHint={
								values.provider
									? "No models registered for this provider."
									: "Pick a provider first."
							}
							aria-label="Allowed models"
							disabled={!values.provider}
						/>
					)}
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						UI-only stash for now — backend persistence lands with{" "}
						<code>spec.models[]</code>.
					</p>
				</Section>

				<Section
					icon={KeyRound}
					title="Upstream secrets"
					description="Provider credentials Relay rotates through when calls hit this policy."
				>
					<p className="mb-2 text-sm text-muted-foreground">
						Order is preserved — Relay tries them top-to-bottom on rate-limit
						errors.
					</p>
					<MultiSelect
						options={secretOptions}
						selected={values.secrets}
						onChange={(next) => form.setFieldValue("secrets", next)}
						placeholder="Attach provider keys…"
						emptyHint="No secrets defined."
						aria-label="Upstream secrets"
					/>
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						No secrets means relay keys using this policy will fail until you
						attach at least one.
					</p>
				</Section>

				<Section
					icon={Gauge}
					title="Rate limits"
					description="Throttling rules applied to every request hitting this policy."
				>
					<MultiSelect
						options={rateLimitOptions}
						selected={values.rateLimits}
						onChange={(next) => form.setFieldValue("rateLimits", next)}
						placeholder="Attach rate limits…"
						emptyHint="No rate limits defined."
						aria-label="Rate limits"
					/>
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						Each attached limit is enforced independently.
					</p>
				</Section>

				<Section
					icon={ShieldCheck}
					title="Relay keys"
					description="Which relay keys inherit this policy's settings."
				>
					<div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
						Backend doesn't expose policy attachments on relay keys yet — this
						picker will land once it does. For now, attach policies from the
						relay-key form.
					</div>
				</Section>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-0 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted"
				>
					Cancel
				</button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<button
							type="submit"
							disabled={isSubmitting}
							className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground disabled:opacity-50"
						>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

interface SectionProps {
	icon: LucideIcon;
	title: string;
	description: string;
	children: React.ReactNode;
}

function Section({ icon: Icon, title, description, children }: SectionProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 md:gap-8 py-8 first:pt-0 last:pb-0">
			<div className="md:pt-0.5">
				<div className="flex items-center gap-2">
					<Icon
						className="w-3.5 h-3.5 text-muted-foreground shrink-0"
						aria-hidden="true"
					/>
					<h2 className="text-sm font-semibold text-foreground">{title}</h2>
				</div>
				<p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
					{description}
				</p>
			</div>
			<div className="min-w-0">{children}</div>
		</div>
	);
}
