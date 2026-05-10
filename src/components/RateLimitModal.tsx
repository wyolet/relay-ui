import type { RateLimit } from "@/api/types/ratelimit";
import { Modal } from "@/components/Modal";
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

interface RateLimitModalProps {
	open: boolean;
	onClose: () => void;
	/** Provided for edit mode. */
	rateLimit?: RateLimit;
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

const SOURCES: {
	value: "ip" | "api_key" | "user" | "global";
	label: string;
}[] = [
	{ value: "global", label: "Global" },
	{ value: "api_key", label: "Per API key" },
	{ value: "user", label: "Per user" },
	{ value: "ip", label: "Per IP" },
];

const WINDOW_PRESETS: { label: string; seconds: number }[] = [
	{ label: "1 min", seconds: 60 },
	{ label: "5 min", seconds: 300 },
	{ label: "15 min", seconds: 900 },
	{ label: "1 hour", seconds: 3600 },
	{ label: "1 day", seconds: 86_400 },
];

export function RateLimitModal({
	open,
	onClose,
	rateLimit,
}: RateLimitModalProps) {
	const { form, values, isEdit, nameError, windowError, amountError } =
		useRateLimitForm({ open, rateLimit, onSaved: onClose });

	const presetMatch = WINDOW_PRESETS.find((p) => p.seconds === values.window);

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={isEdit ? `Edit ${rateLimit?.metadata.name}` : "Create rate limit"}
			size="md"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="flex flex-col gap-5"
			>
				{!isEdit && (
					<Field label="Name">
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
							<p className="mt-1 text-[11px] text-destructive">{nameError}</p>
						)}
					</Field>
				)}

				<Field label="Strategy">
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
					<p className="mt-1 text-[11px] text-muted-foreground">
						{STRATEGIES.find((s) => s.value === values.strategy)?.hint}
					</p>
				</Field>

				<div className="grid grid-cols-2 gap-3">
					<Field label="Amount">
						<Input
							type="number"
							min={1}
							inputMode="numeric"
							value={values.amount}
							onChange={(e) =>
								form.setFieldValue("amount", Number(e.currentTarget.value))
							}
							placeholder="100"
							aria-invalid={amountError ? true : undefined}
						/>
						{amountError && (
							<p className="mt-1 text-[11px] text-destructive">{amountError}</p>
						)}
					</Field>

					<Field label="Window">
						<div className="flex items-center gap-2">
							<Select
								value={presetMatch ? String(presetMatch.seconds) : "custom"}
								onValueChange={(v) => {
									if (v === "custom") return;
									form.setFieldValue("window", Number(v));
								}}
							>
								<SelectTrigger className="flex-1">
									<SelectValue />
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
								<Input
									type="number"
									min={1}
									inputMode="numeric"
									value={values.window}
									onChange={(e) =>
										form.setFieldValue("window", Number(e.currentTarget.value))
									}
									className="w-24"
									aria-invalid={windowError ? true : undefined}
								/>
							)}
						</div>
						{windowError && (
							<p className="mt-1 text-[11px] text-destructive">{windowError}</p>
						)}
						<p className="mt-1 text-[11px] text-muted-foreground">
							Per-window seconds.
						</p>
					</Field>
				</div>

				<Field label="Source">
					<Select
						value={values.source}
						onValueChange={(v) =>
							form.setFieldValue("source", v as typeof values.source)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SOURCES.map((s) => (
								<SelectItem key={s.value} value={s.value}>
									{s.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="mt-1 text-[11px] text-muted-foreground">
						How traffic gets bucketed before counting against the limit.
					</p>
				</Field>

				<div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
					<button
						type="button"
						onClick={onClose}
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
								{isSubmitting ? "Saving…" : isEdit ? "Save" : "Create"}
							</button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</Modal>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
				{label}
			</div>
			{children}
		</div>
	);
}
