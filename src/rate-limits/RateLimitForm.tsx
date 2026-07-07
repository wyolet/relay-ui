import { Gauge, Plus, Undo2, X } from "lucide-react";
import type { RateLimit } from "@/api/types/ratelimit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	digitsOnly,
	formatThousands,
	makeStepHandler,
} from "@/lib/numberFormat";
import { WINDOW_PRESETS } from "@/lib/timeWindow";
import {
	METER_VALUES,
	type RateLimitMeter,
	type RateLimitStrategy,
	type RuleDraft,
	STRATEGY_VALUES,
	useRateLimitForm,
} from "@/rate-limits/useRateLimitForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";

interface RateLimitFormProps {
	rateLimit?: RateLimit;
	onSaved: () => void;
	onCancel: () => void;
}

const STRATEGY_OPTIONS: Record<
	RateLimitStrategy,
	{ label: string; hint: string }
> = {
	"token-bucket": {
		label: "Token bucket",
		hint: "Refills steadily; allows short bursts up to the bucket size.",
	},
	"sliding-window": {
		label: "Sliding window",
		hint: "Smooth, accurate count over a moving window — no boundary bursts.",
	},
	"fixed-window": {
		label: "Fixed window",
		hint: "Counter resets at fixed intervals. Cheapest, but allows edge bursts.",
	},
	"leaky-bucket": {
		label: "Leaky bucket",
		hint: "Constant outflow; excess requests queue or get dropped.",
	},
	"session-window": {
		label: "Session window",
		hint: "Per-session counter — resets after a quiet period.",
	},
};

const METER_OPTIONS: Record<RateLimitMeter, { label: string; hint: string }> = {
	requests: { label: "Requests", hint: "One unit per API call." },
	concurrency: {
		label: "Concurrency",
		hint: "Caps in-flight requests at any moment.",
	},
	tokens: {
		label: "Tokens (all)",
		hint: "Sum of every token sub-meter.",
	},
	"tokens.input": {
		label: "Tokens · input",
		hint: "Prompt tokens sent to the provider.",
	},
	"tokens.output": {
		label: "Tokens · output",
		hint: "Generated completion tokens.",
	},
	"tokens.cache_read": {
		label: "Tokens · cache read",
		hint: "Tokens served from prompt cache.",
	},
	"tokens.cache_creation": {
		label: "Tokens · cache creation",
		hint: "Tokens written into prompt cache.",
	},
	"tokens.reasoning": {
		label: "Tokens · reasoning",
		hint: "Hidden reasoning / thinking tokens.",
	},
	"tokens.server_tool_use_input": {
		label: "Tokens · server tool input",
		hint: "Input tokens spent on server-side tool calls.",
	},
	"tokens.server_tool_use_output": {
		label: "Tokens · server tool output",
		hint: "Output tokens from server-side tool calls.",
	},
};

export function RateLimitForm({
	rateLimit,
	onSaved,
	onCancel,
}: RateLimitFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		rulesError,
		addRule,
		removeRule,
		updateRule,
		ruleErrors,
	} = useRateLimitForm({ rateLimit, onSaved });

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
					autoFocus
					placeholder="Default rate limit"
				/>

				<FormSection
					icon={Gauge}
					title="Rules"
					description="Each rule picks a meter, strategy, and window. They're enforced independently — the first to exhaust blocks the request."
				>
					<div className="flex flex-col gap-2">
						{values.rules.map((rule, idx) => (
							<RuleRow
								// biome-ignore lint/suspicious/noArrayIndexKey: rules are user-ordered with no stable id
								key={idx}
								rule={rule}
								canRemove={values.rules.length > 1}
								amountError={ruleErrors[idx]?.amount}
								windowError={ruleErrors[idx]?.window}
								onChange={(patch) => updateRule(idx, patch)}
								onRemove={() => removeRule(idx)}
							/>
						))}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="lg"
						onClick={addRule}
						className="mt-2"
					>
						<Plus className="size-3.5" />
						Add rule
					</Button>
					{rulesError && (
						<p className="mt-1.5 text-[11px] text-destructive">{rulesError}</p>
					)}
				</FormSection>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<Button type="button" variant="outline" size="lg" onClick={onCancel}>
					Cancel
				</Button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" size="lg" disabled={isSubmitting}>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

interface RuleRowProps {
	rule: RuleDraft;
	canRemove: boolean;
	amountError?: string;
	windowError?: string;
	onChange: (patch: Partial<RuleDraft>) => void;
	onRemove: () => void;
}

function RuleRow({
	rule,
	canRemove,
	amountError,
	windowError,
	onChange,
	onRemove,
}: RuleRowProps) {
	const hasError = Boolean(amountError || windowError);
	const matchedPreset = WINDOW_PRESETS.find(
		(p) => String(p.value) === rule.window,
	);
	const customWindow = rule.isCustomWindow;
	return (
		<div
			className={[
				"rounded-md border bg-card overflow-hidden",
				hasError ? "border-destructive/60" : "border-border",
			].join(" ")}
		>
			<div className="grid grid-cols-[1fr_1fr_2fr_2fr_auto] gap-2 items-end p-3">
				<LabeledInput label="Amount">
					<Input
						type="text"
						inputMode="numeric"
						value={formatThousands(rule.amount)}
						aria-invalid={amountError ? true : undefined}
						onChange={(e) =>
							onChange({ amount: digitsOnly(e.currentTarget.value) })
						}
						onKeyDown={makeStepHandler(rule.amount, (next) =>
							onChange({ amount: next }),
						)}
						placeholder="100"
					/>
				</LabeledInput>
				<LabeledInput
					label={customWindow ? "Window (s)" : "Window"}
					action={
						customWindow ? (
							<Button
								type="button"
								variant="ghost"
								size="xs"
								onClick={() =>
									onChange({ window: "60", isCustomWindow: false })
								}
								className="h-auto gap-0.5 px-0 text-[10px] text-muted-foreground hover:bg-transparent hover:text-foreground"
							>
								<Undo2 className="w-3 h-3" />
								Preset
							</Button>
						) : undefined
					}
				>
					{customWindow ? (
						<Input
							type="text"
							inputMode="numeric"
							value={formatThousands(rule.window)}
							aria-invalid={windowError ? true : undefined}
							onChange={(e) =>
								onChange({ window: digitsOnly(e.currentTarget.value) })
							}
							onKeyDown={makeStepHandler(rule.window, (next) =>
								onChange({ window: next }),
							)}
							placeholder="60"
						/>
					) : (
						<Select
							value={String(matchedPreset?.value ?? WINDOW_PRESETS[1].value)}
							items={[
								...WINDOW_PRESETS.map((p) => ({
									value: String(p.value),
									label: p.label,
								})),
								{ value: "custom", label: "Custom…" },
							]}
							onValueChange={(v) => {
								if (v === null) return;
								if (v === "custom") {
									onChange({ isCustomWindow: true });
									return;
								}
								onChange({ window: v, isCustomWindow: false });
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{WINDOW_PRESETS.map((p) => (
									<SelectItem key={p.value} value={String(p.value)}>
										{p.label}
									</SelectItem>
								))}
								<SelectItem value="custom">Custom…</SelectItem>
							</SelectContent>
						</Select>
					)}
				</LabeledInput>
				<LabeledInput label="Meter">
					<Select
						value={rule.meter}
						items={METER_VALUES.map((m) => ({
							value: m,
							label: METER_OPTIONS[m].label,
						}))}
						onValueChange={(v) => onChange({ meter: v as RateLimitMeter })}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{METER_VALUES.map((m) => (
								<SelectItem key={m} value={m}>
									<OptionWithHint
										label={METER_OPTIONS[m].label}
										hint={METER_OPTIONS[m].hint}
									/>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</LabeledInput>
				<LabeledInput label="Strategy">
					<Select
						value={rule.strategy}
						items={STRATEGY_VALUES.map((s) => ({
							value: s,
							label: STRATEGY_OPTIONS[s].label,
						}))}
						onValueChange={(v) =>
							onChange({ strategy: v as RateLimitStrategy })
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{STRATEGY_VALUES.map((s) => (
								<SelectItem key={s} value={s}>
									<OptionWithHint
										label={STRATEGY_OPTIONS[s].label}
										hint={STRATEGY_OPTIONS[s].hint}
									/>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</LabeledInput>
				<Button
					type="button"
					variant="ghost"
					size="icon-lg"
					onClick={onRemove}
					disabled={!canRemove}
					aria-label="Remove rule"
					className="size-9 text-muted-foreground hover:text-destructive"
				>
					<X className="size-3.5" />
				</Button>
			</div>
			{hasError && (
				<div
					role="alert"
					className="border-t border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive space-y-0.5"
				>
					{amountError && (
						<div>
							<span className="font-medium">Amount:</span> {amountError}
						</div>
					)}
					{windowError && (
						<div>
							<span className="font-medium">Window:</span> {windowError}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function OptionWithHint({ label, hint }: { label: string; hint: string }) {
	return (
		<span className="flex flex-col items-start gap-0.5 whitespace-normal">
			<span className="text-sm text-foreground">{label}</span>
			<span className="text-[11px] leading-snug text-muted-foreground">
				{hint}
			</span>
		</span>
	);
}

function LabeledInput({
	label,
	action,
	children,
}: {
	label: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="flex items-center justify-between gap-2 mb-1 h-3.5">
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					{label}
				</div>
				{action}
			</div>
			{children}
		</div>
	);
}
