import {
	Boxes,
	Gauge,
	KeyRound,
	type LucideIcon,
	ShieldCheck,
	Tag,
} from "lucide-react";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useModels } from "@/api/hooks/models";
import { useAttachableRateLimits } from "@/api/hooks/ratelimits";
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
import { displayLabel } from "@/lib/displayLabel";
import {
	KEY_SELECTION_VALUES,
	type KeySelection,
	usePolicyForm,
} from "@/components/usePolicyForm";

const KEY_SELECTION_OPTIONS: Record<
	KeySelection,
	{ label: string; hint: string }
> = {
	prioritized: {
		label: "Prioritized",
		hint: "Drain the first healthy key in declaration order.",
	},
	"round-robin": {
		label: "Round-robin",
		hint: "Rotate evenly across healthy keys, one request per key.",
	},
	"least-recently-used": {
		label: "Least recently used",
		hint: "Pick whichever healthy key has been idle longest.",
	},
};

interface PolicyFormProps {
	policy?: Policy;
	onSaved: () => void;
	onCancel: () => void;
}

export function PolicyForm({ policy, onSaved, onCancel }: PolicyFormProps) {
	const { data: hostKeysData } = useHostKeys();
	const { data: modelsData } = useModels();
	const allRateLimits = useAttachableRateLimits();

	const { form, values, isEdit, nameError } = usePolicyForm({
		open: true,
		policy,
		onSaved,
	});

	const allHostKeys = hostKeysData.items ?? [];
	const allModels = modelsData.items ?? [];

	const hostKeyOptions = allHostKeys.map((hk) => ({
		value: hk.metadata.id ?? "",
		label: displayLabel(hk.metadata),
	}));
	const modelOptions = allModels.map((m) => ({
		value: m.metadata.id ?? "",
		label: displayLabel(m.metadata),
	}));
	const rateLimitOptions = allRateLimits.map((rl) => ({
		value: rl.metadata.id ?? "",
		label: displayLabel(rl.metadata),
	}));

	const modelsMode = values.modelIds.length === 0 ? "all" : "specific";

	function setModelsMode(mode: "all" | "specific") {
		if (mode === "all") {
			form.setFieldValue("modelIds", []);
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
					icon={Boxes}
					title="Allowed models"
					description="Restrict which models relay keys using this policy can call."
				>
					<p className="mb-2 text-sm text-muted-foreground">
						Leave on <strong className="text-foreground">All</strong> to permit
						every model, or switch to{" "}
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
							{allModels.length} model{allModels.length === 1 ? "" : "s"}
						</span>
					</div>
					{modelsMode === "specific" && (
						<MultiSelect
							options={modelOptions}
							selected={values.modelIds}
							onChange={(next) => form.setFieldValue("modelIds", next)}
							placeholder="Pick models…"
							emptyHint="No models registered."
							aria-label="Allowed models"
						/>
					)}
				</Section>

				<Section
					icon={KeyRound}
					title="Host keys"
					description="Credentials Relay rotates through when calls hit this policy."
				>
					<p className="mb-2 text-sm text-muted-foreground">
						Order is preserved — Relay tries them top-to-bottom on rate-limit
						errors.
					</p>
					<MultiSelect
						options={hostKeyOptions}
						selected={values.hostKeyIds}
						onChange={(next) => form.setFieldValue("hostKeyIds", next)}
						placeholder="Attach host keys…"
						emptyHint="No host keys defined."
						aria-label="Host keys"
					/>
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						No keys means relay keys using this policy will fail until you
						attach at least one.
					</p>

					<div className="mt-4">
						<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Selection strategy
						</div>
						<Select
							value={values.keySelection}
							onValueChange={(v) =>
								form.setFieldValue("keySelection", v as KeySelection)
							}
						>
							<SelectTrigger className="w-full max-w-md">
								<SelectValue>
									{KEY_SELECTION_OPTIONS[values.keySelection].label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{KEY_SELECTION_VALUES.map((k) => (
									<SelectItem key={k} value={k}>
										<span className="flex flex-col items-start gap-0.5 whitespace-normal">
											<span className="text-sm text-foreground">
												{KEY_SELECTION_OPTIONS[k].label}
											</span>
											<span className="text-[11px] leading-snug text-muted-foreground">
												{KEY_SELECTION_OPTIONS[k].hint}
											</span>
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="mt-1.5 text-[11px] text-muted-foreground">
							{KEY_SELECTION_OPTIONS[values.keySelection].hint}
						</p>
					</div>
				</Section>

				<Section
					icon={Gauge}
					title="Rate limit"
					description="Throttling rule applied to every request hitting this policy."
				>
					<Select
						value={values.rateLimitId || "none"}
						onValueChange={(v) =>
							form.setFieldValue("rateLimitId", v === "none" || v == null ? "" : v)
						}
					>
						<SelectTrigger className="w-full max-w-md">
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">None</SelectItem>
							{rateLimitOptions.map((rl) => (
								<SelectItem key={rl.value} value={rl.value}>
									{rl.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Section>

				<Section
					icon={ShieldCheck}
					title="Relay keys"
					description="Which relay keys inherit this policy's settings."
				>
					<div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
						Attach policies from the relay-key form.
					</div>
				</Section>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
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
