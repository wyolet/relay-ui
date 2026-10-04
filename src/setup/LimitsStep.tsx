import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/shared/Segmented";
import { wizardGhost, wizardPrimary } from "./ui";
import type {
	EasyRateLimit,
	EasyRateLimitRule,
	RateLimitPer,
} from "./useSetupWizard";

interface LimitsStepProps {
	providerLabel: string;
	busy: boolean;
	error: string | null;
	onSubmit: (limit: EasyRateLimit | null) => void;
}

const PER_OPTIONS: { value: RateLimitPer; label: string }[] = [
	{ value: "minute", label: "minute" },
	{ value: "hour", label: "hour" },
	{ value: "day", label: "day" },
];

/** Compact period pills, sized to sit blended inside an InputGroup addon. */
function PerSegmented({
	value,
	onChange,
}: {
	value: RateLimitPer;
	onChange: (value: RateLimitPer) => void;
}) {
	return <Segmented value={value} onChange={onChange} options={PER_OPTIONS} />;
}

interface LimitBlockState {
	enabled: boolean;
	amount: string;
	per: RateLimitPer;
}

function parseAmount(amount: string): number {
	return Number.parseInt(amount.replace(/[,_\s]/g, ""), 10);
}

function blockValid(b: LimitBlockState): boolean {
	if (!b.enabled) return true;
	const n = parseAmount(b.amount);
	return Number.isFinite(n) && n >= 1;
}

function blockRule(b: LimitBlockState): EasyRateLimitRule | undefined {
	if (!b.enabled) return undefined;
	const n = parseAmount(b.amount);
	if (!Number.isFinite(n) || n < 1) return undefined;
	return { amount: n, per: b.per };
}

interface LimitBlockProps {
	title: string;
	subtitle: string;
	unit: string;
	state: LimitBlockState;
	onChange: (next: LimitBlockState) => void;
}

function LimitBlock({
	title,
	subtitle,
	unit,
	state,
	onChange,
}: LimitBlockProps) {
	const valid = blockValid(state);
	const parsed = parseAmount(state.amount);
	return (
		<div className="overflow-hidden rounded-xl border border-border bg-background">
			<div className="flex items-center justify-between gap-3 px-5 py-4">
				<div>
					<p className="text-sm font-medium text-foreground">{title}</p>
					<p className="text-xs text-muted-foreground">{subtitle}</p>
				</div>
				<Switch
					checked={state.enabled}
					onCheckedChange={(enabled) => onChange({ ...state, enabled })}
					aria-label={`Limit ${unit}`}
				/>
			</div>

			{state.enabled && (
				<div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-4">
					<InputGroup className="h-10 bg-card">
						<InputGroupInput
							type="text"
							inputMode="numeric"
							value={state.amount}
							onChange={(e) => onChange({ ...state, amount: e.target.value })}
							className="text-sm tabular-nums"
							aria-invalid={!valid}
							aria-label={`Maximum ${unit}`}
						/>
						<InputGroupAddon align="inline-end" className="gap-2 pr-1.5">
							<span className="text-xs text-muted-foreground">{unit} per</span>
							<PerSegmented
								value={state.per}
								onChange={(per) => onChange({ ...state, per })}
							/>
						</InputGroupAddon>
					</InputGroup>
					{valid && (
						<p className="px-0.5 text-xs text-muted-foreground">
							Each client can use up to{" "}
							<span className="font-medium text-foreground tabular-nums">
								{parsed.toLocaleString()}
							</span>{" "}
							{unit} every {state.per}.
						</p>
					)}
				</div>
			)}
		</div>
	);
}

export function LimitsStep({
	providerLabel,
	busy,
	error,
	onSubmit,
}: LimitsStepProps) {
	const [requests, setRequests] = useState<LimitBlockState>({
		enabled: false,
		amount: "60",
		per: "minute",
	});
	const [tokens, setTokens] = useState<LimitBlockState>({
		enabled: false,
		amount: "100000",
		per: "minute",
	});

	const canSubmit = blockValid(requests) && blockValid(tokens);

	function handleSubmit() {
		if (busy || !canSubmit) return;
		const limit: EasyRateLimit = {};
		const req = blockRule(requests);
		const tok = blockRule(tokens);
		if (req) limit.requests = req;
		if (tok) limit.tokens = tok;
		onSubmit(Object.keys(limit).length > 0 ? limit : null);
	}

	return (
		<div className="flex flex-col gap-6">
			<header className="text-center">
				<h2 className="text-xl font-bold text-foreground">Add a rate limit?</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Cap how hard clients can hit {providerLabel} through this key. Enable
					either, both, or neither — change it anytime.
				</p>
			</header>

			<div className="flex flex-col gap-3">
				<LimitBlock
					title="Request rate"
					subtitle="Throttle how many calls go through"
					unit="requests"
					state={requests}
					onChange={setRequests}
				/>
				<LimitBlock
					title="Token usage"
					subtitle="Cap total tokens consumed"
					unit="tokens"
					state={tokens}
					onChange={setTokens}
				/>
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}

			<div className="flex items-center justify-between">
				<Button
					type="button"
					variant="ghost"
					className={wizardGhost}
					onClick={() => onSubmit(null)}
					disabled={busy}
				>
					Skip
				</Button>
				<Button
					type="button"
					className={wizardPrimary}
					onClick={handleSubmit}
					disabled={busy || !canSubmit}
				>
					{busy ? "Finishing…" : "Create my key"}
				</Button>
			</div>
		</div>
	);
}
