import { Banknote, Boxes, Plus, X } from "lucide-react";
import type { Pricing } from "@/api/types/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PRICING_METERS, PRICING_UNITS } from "@/lib/usage-math/pricing";
import { prettyMeter, prettyUnit } from "@/pricing/MeterGrid";
import { TargetModelsField } from "@/pricing/TargetModelsField";
import { useHostOptions } from "@/pricing/useHostOptions";
import { type RateDraft, usePricingForm } from "@/pricing/usePricingForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";

interface PricingFormProps {
	pricing?: Pricing;
	onSaved: (name: string) => void;
	onCancel: () => void;
}

const METER_HINTS: Record<string, string> = {
	"tokens.input": "Prompt tokens sent to the provider.",
	"tokens.output": "Generated completion tokens.",
	"tokens.cache_read": "Tokens served from prompt cache.",
	"tokens.cache_creation": "Tokens written into prompt cache.",
	"tokens.reasoning": "Hidden reasoning / thinking tokens.",
	"tokens.audio_input": "Audio input tokens.",
	"tokens.audio_output": "Audio output tokens.",
	"tokens.accepted_prediction": "Accepted prediction tokens.",
	"tokens.rejected_prediction": "Rejected prediction tokens.",
	"tokens.server_tool_use_input": "Input tokens for server-side tool calls.",
	"tokens.server_tool_use_output": "Output tokens from server-side tool calls.",
};

/** Keep digits and at most one decimal point. */
function decimalOnly(s: string): string {
	const cleaned = s.replace(/[^\d.]/g, "");
	const firstDot = cleaned.indexOf(".");
	if (firstDot === -1) return cleaned;
	return (
		cleaned.slice(0, firstDot + 1) +
		cleaned.slice(firstDot + 1).replace(/\./g, "")
	);
}

export function PricingForm({ pricing, onSaved, onCancel }: PricingFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		currencyError,
		hostError,
		targetModelsError,
		ratesError,
		rateErrors,
		addRate,
		removeRate,
		updateRate,
		setTargetModels,
	} = usePricingForm({ pricing, onSaved });
	const hostOptions = useHostOptions();

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
					placeholder="Claude Sonnet — Anthropic list"
				/>

				<FormSection
					icon={Banknote}
					title="Rates"
					description="A rate sheet belongs to the host that bills it. Per-meter cost in the billing currency; leave the threshold empty for a meter's base rate, add rows with a threshold for volume tiers."
				>
					<div className="mb-3 grid grid-cols-[1fr_120px] gap-2 max-w-md">
						<div>
							<RowLabel>Owning host</RowLabel>
							<Select
								value={values.host || null}
								items={hostOptions.map((h) => ({
									value: h.id,
									label: h.label,
								}))}
								onValueChange={(v) => {
									if (v !== null) form.setFieldValue("host", v);
								}}
							>
								<SelectTrigger
									className="w-full"
									aria-invalid={hostError ? true : undefined}
								>
									<SelectValue placeholder="Pick a host" />
								</SelectTrigger>
								<SelectContent>
									{hostOptions.map((h) => (
										<SelectItem key={h.id} value={h.id}>
											<span className="flex flex-col items-start gap-0.5">
												<span className="text-sm text-foreground">
													{h.label}
												</span>
												<span className="font-mono text-[11px] text-muted-foreground">
													{h.slug}
												</span>
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{hostError && (
								<p className="mt-1.5 text-[11px] text-destructive">
									{hostError}
								</p>
							)}
						</div>
						<div>
							<RowLabel>Currency</RowLabel>
							<Input
								type="text"
								value={values.currency}
								maxLength={3}
								aria-invalid={currencyError ? true : undefined}
								onChange={(e) =>
									form.setFieldValue(
										"currency",
										e.currentTarget.value.toUpperCase(),
									)
								}
								placeholder="USD"
								className="font-mono uppercase"
							/>
							{currencyError && (
								<p className="mt-1.5 text-[11px] text-destructive">
									{currencyError}
								</p>
							)}
						</div>
					</div>
					<div className="flex flex-col gap-2">
						{values.rates.map((rate, idx) => (
							<RateRow
								// biome-ignore lint/suspicious/noArrayIndexKey: rates are user-ordered with no stable id
								key={idx}
								rate={rate}
								currency={values.currency}
								canRemove={values.rates.length > 1}
								amountError={rateErrors[idx]?.amount}
								thresholdError={rateErrors[idx]?.aboveTokens}
								onChange={(patch) => updateRate(idx, patch)}
								onRemove={() => removeRate(idx)}
							/>
						))}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="lg"
						onClick={addRate}
						className="mt-2"
					>
						<Plus className="size-3.5" />
						Add rate
					</Button>
					{ratesError && (
						<p className="mt-1.5 text-[11px] text-destructive">{ratesError}</p>
					)}
				</FormSection>

				<FormSection
					icon={Boxes}
					title="Target models"
					description="The models this rate sheet covers on the owning host. One sheet can span a whole model family without duplicating rows."
				>
					<TargetModelsField
						value={values.targetModels}
						onChange={setTargetModels}
					/>
					{targetModelsError && (
						<p className="mt-1.5 text-[11px] text-destructive">
							{targetModelsError}
						</p>
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

interface RateRowProps {
	rate: RateDraft;
	currency: string;
	canRemove: boolean;
	amountError?: string;
	thresholdError?: string;
	onChange: (patch: Partial<RateDraft>) => void;
	onRemove: () => void;
}

function RateRow({
	rate,
	currency,
	canRemove,
	amountError,
	thresholdError,
	onChange,
	onRemove,
}: RateRowProps) {
	const hasError = Boolean(amountError || thresholdError);
	const isTier = rate.aboveTokens !== "";
	return (
		<div
			className={[
				"rounded-md border bg-card overflow-hidden",
				hasError ? "border-destructive/60" : "border-border",
			].join(" ")}
		>
			<div className="grid grid-cols-[2fr_1.5fr_1.5fr_2fr_auto] gap-2 items-end p-3">
				<div>
					<RowLabel>Meter</RowLabel>
					<Select
						value={rate.meter}
						items={PRICING_METERS.map((m) => ({
							value: m,
							label: prettyMeter(m),
						}))}
						onValueChange={(v) => {
							if (v !== null) onChange({ meter: v });
						}}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PRICING_METERS.map((m) => (
								<SelectItem key={m} value={m}>
									<span className="flex flex-col items-start gap-0.5 whitespace-normal">
										<span className="text-sm text-foreground">
											{prettyMeter(m)}
										</span>
										<span className="text-[11px] leading-snug text-muted-foreground">
											{METER_HINTS[m]}
										</span>
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<RowLabel>Amount ({currency || "USD"})</RowLabel>
					<Input
						type="text"
						inputMode="decimal"
						value={rate.amount}
						aria-invalid={amountError ? true : undefined}
						onChange={(e) =>
							onChange({ amount: decimalOnly(e.currentTarget.value) })
						}
						placeholder="3.00"
					/>
				</div>
				<div>
					<RowLabel>Per</RowLabel>
					<Select
						value={rate.unit}
						items={PRICING_UNITS.map((u) => ({
							value: u,
							label: prettyUnit(u),
						}))}
						onValueChange={(v) => {
							if (v !== null) onChange({ unit: v });
						}}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PRICING_UNITS.map((u) => (
								<SelectItem key={u} value={u}>
									{prettyUnit(u)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<RowLabel hint={isTier ? "tier" : "base rate"}>Above tokens</RowLabel>
					<Input
						type="text"
						inputMode="numeric"
						value={rate.aboveTokens}
						aria-invalid={thresholdError ? true : undefined}
						onChange={(e) =>
							onChange({
								aboveTokens: e.currentTarget.value.replace(/\D/g, ""),
							})
						}
						placeholder="empty = base"
					/>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon-lg"
					onClick={onRemove}
					disabled={!canRemove}
					aria-label="Remove rate"
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
					{thresholdError && (
						<div>
							<span className="font-medium">Threshold:</span> {thresholdError}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function RowLabel({
	children,
	hint,
}: {
	children: React.ReactNode;
	hint?: string;
}) {
	return (
		<div className="flex items-center justify-between gap-2 mb-1 h-3.5">
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{children}
			</div>
			{hint && (
				<div className="text-[10px] text-muted-foreground/70">{hint}</div>
			)}
		</div>
	);
}
