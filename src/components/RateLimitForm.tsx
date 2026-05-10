import {
	Clock,
	Gauge,
	type LucideIcon,
	Plus,
	Tag,
	Timer,
	X,
} from "lucide-react";
import type { RateLimit } from "@/api/types/ratelimit";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRateLimitForm } from "@/components/useRateLimitForm";

interface RateLimitFormProps {
	rateLimit?: RateLimit;
	onSaved: () => void;
	onCancel: () => void;
}

const STRATEGIES: {
	value: "fixed_window" | "sliding_window" | "token_bucket";
	label: string;
	hint: string;
}[] = [
	{ value: "fixed_window", label: "Fixed", hint: "Reset every window" },
	{
		value: "sliding_window",
		label: "Sliding",
		hint: "Smoother, more accurate",
	},
	{ value: "token_bucket", label: "Token bucket", hint: "Allows short bursts" },
];

const WINDOW_PRESETS: { label: string; seconds: number }[] = [
	{ label: "1 minute", seconds: 60 },
	{ label: "5 minutes", seconds: 300 },
	{ label: "15 minutes", seconds: 900 },
	{ label: "1 hour", seconds: 3600 },
	{ label: "1 day", seconds: 86_400 },
];

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
		windowError,
		rulesError,
		addRule,
		removeRule,
		updateRule,
	} = useRateLimitForm({ rateLimit, onSaved });

	const presetMatch = WINDOW_PRESETS.find((p) => p.seconds === values.window);
	const windowSelectValue = presetMatch ? String(presetMatch.seconds) : "custom";

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
							placeholder="default-rl"
							aria-invalid={nameError ? true : undefined}
							autoFocus
						/>
						{nameError && (
							<p className="mt-1.5 text-[11px] text-destructive">{nameError}</p>
						)}
					</Section>
				)}

				<Section
					icon={Timer}
					title="Strategy"
					description="How counters reset across the window."
				>
					<Tabs
						value={values.strategy}
						onValueChange={(v) =>
							form.setFieldValue("strategy", v as typeof values.strategy)
						}
					>
						<TabsList>
							{STRATEGIES.map((s) => (
								<TabsTrigger key={s.value} value={s.value}>
									{s.label}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						{STRATEGIES.find((s) => s.value === values.strategy)?.hint}
					</p>
				</Section>

				<Section
					icon={Clock}
					title="Window"
					description="How long the counter stays open before it resets."
				>
					<div className="flex items-center gap-2">
						<Select
							value={windowSelectValue}
							onValueChange={(v) => {
								if (v === "custom") return;
								form.setFieldValue("window", Number(v));
							}}
						>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="Window">
									{presetMatch
										? presetMatch.label
										: `${values.window}s (custom)`}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{WINDOW_PRESETS.map((p) => (
									<SelectItem key={p.seconds} value={String(p.seconds)}>
										{p.label}
									</SelectItem>
								))}
								<SelectItem value="custom">Custom…</SelectItem>
							</SelectContent>
						</Select>
						{!presetMatch && (
							<div className="flex items-center gap-1.5">
								<Input
									type="number"
									min={1}
									inputMode="numeric"
									value={values.window}
									onChange={(e) =>
										form.setFieldValue(
											"window",
											Number(e.currentTarget.value),
										)
									}
									className="w-28"
									aria-invalid={windowError ? true : undefined}
								/>
								<span className="text-[11px] text-muted-foreground">
									seconds
								</span>
							</div>
						)}
					</div>
					{windowError && (
						<p className="mt-1.5 text-[11px] text-destructive">{windowError}</p>
					)}
				</Section>

				<Section
					icon={Gauge}
					title="Rules"
					description="Each rule is enforced independently within the window. The first to exhaust blocks the request."
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

interface RuleRowProps {
	rule: { amount: number; meter: string; source: string };
	canRemove: boolean;
	onChange: (
		patch: Partial<{ amount: number; meter: string; source: string }>,
	) => void;
	onRemove: () => void;
}

function RuleRow({ rule, canRemove, onChange, onRemove }: RuleRowProps) {
	return (
		<div className="grid grid-cols-[1fr_2fr_2fr_auto] gap-2 items-end rounded-md border border-border bg-card p-3">
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
			<LabeledInput label="Meter">
				<Input
					type="text"
					value={rule.meter}
					onChange={(e) => onChange({ meter: e.currentTarget.value })}
					placeholder="requests, tokens.input, …"
				/>
			</LabeledInput>
			<LabeledInput label="Source">
				<Input
					type="text"
					value={rule.source}
					onChange={(e) => onChange({ source: e.currentTarget.value })}
					placeholder="global, api_key, …"
				/>
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
