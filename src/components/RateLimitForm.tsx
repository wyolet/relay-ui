import { Gauge, type LucideIcon, Plus, Tag, X } from "lucide-react";
import type { RateLimit } from "@/api/types/ratelimit";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	METER_VALUES,
	type RateLimitMeter,
	type RateLimitStrategy,
	STRATEGY_VALUES,
	useRateLimitForm,
} from "@/components/useRateLimitForm";

interface RateLimitFormProps {
	rateLimit?: RateLimit;
	onSaved: () => void;
	onCancel: () => void;
}

const STRATEGY_OPTIONS: Record<RateLimitStrategy, { label: string; hint: string }> = {
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
		nameError,
		rulesError,
		addRule,
		removeRule,
		updateRule,
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
				<Section
					icon={Tag}
					title="Identity"
					description="A slug used in URLs and references (letters, digits, _ . -), and an optional description for humans."
				>
					<div className="flex flex-col gap-3">
						<div>
							<Input
								type="text"
								value={values.name}
								onChange={(e) =>
									form.setFieldValue("name", e.currentTarget.value)
								}
								placeholder="default-rl"
								aria-invalid={nameError ? true : undefined}
								autoFocus
							/>
							{nameError && (
								<p className="mt-1.5 text-[11px] text-destructive">
									{nameError}
								</p>
							)}
						</div>
						<textarea
							value={values.description}
							onChange={(e) =>
								form.setFieldValue("description", e.currentTarget.value)
							}
							placeholder="Description (optional) — what this rate limit is for…"
							rows={3}
							className="w-full min-w-0 rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-[color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
						/>
					</div>
				</Section>

				<Section
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
								onChange={(patch) => updateRule(idx, patch)}
								onRemove={() => removeRule(idx)}
							/>
						))}
					</div>
					<button
						type="button"
						onClick={addRule}
						className="mt-2 inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-xs font-medium text-foreground hover:bg-muted"
					>
						<Plus className="w-3.5 h-3.5" />
						Add rule
					</button>
					{rulesError && (
						<p className="mt-1.5 text-[11px] text-destructive">{rulesError}</p>
					)}
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

interface RuleRowProps {
	rule: {
		amount: number;
		meter: RateLimitMeter;
		strategy: RateLimitStrategy;
		window: number;
	};
	canRemove: boolean;
	onChange: (
		patch: Partial<{
			amount: number;
			meter: RateLimitMeter;
			strategy: RateLimitStrategy;
			window: number;
		}>,
	) => void;
	onRemove: () => void;
}

function RuleRow({ rule, canRemove, onChange, onRemove }: RuleRowProps) {
	return (
		<div className="grid grid-cols-[1fr_1fr_2fr_2fr_auto] gap-2 items-end rounded-md border border-border bg-card p-3">
			<LabeledInput label="Amount">
				<Input
					type="number"
					min={1}
					inputMode="numeric"
					value={rule.amount}
					onChange={(e) => onChange({ amount: Number(e.currentTarget.value) })}
					placeholder="100"
				/>
			</LabeledInput>
			<LabeledInput label="Window (s)">
				<Input
					type="number"
					min={1}
					inputMode="numeric"
					value={rule.window}
					onChange={(e) => onChange({ window: Number(e.currentTarget.value) })}
					placeholder="60"
				/>
			</LabeledInput>
			<LabeledInput label="Meter">
				<Select
					value={rule.meter}
					onValueChange={(v) => onChange({ meter: v as RateLimitMeter })}
				>
					<SelectTrigger className="w-full">
						<SelectValue>{METER_OPTIONS[rule.meter].label}</SelectValue>
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
					onValueChange={(v) => onChange({ strategy: v as RateLimitStrategy })}
				>
					<SelectTrigger className="w-full">
						<SelectValue>{STRATEGY_OPTIONS[rule.strategy].label}</SelectValue>
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
			<button
				type="button"
				onClick={onRemove}
				disabled={!canRemove}
				aria-label="Remove rule"
				className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
			>
				<X className="w-3.5 h-3.5" />
			</button>
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
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
				{label}
			</div>
			{children}
		</div>
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
