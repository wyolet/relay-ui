import { useQuery } from "@tanstack/react-query";
import { useId, useMemo } from "react";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { isSystemOwned } from "@/lib/systemRateLimits";
import { displayLabel } from "@/lib/displayLabel";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	RateLimitCustomDraft,
	RateLimitDraft,
	RelayKeyDraft,
} from "@/stores/keys";

const EXPIRY_PRESETS: { label: string; days: number | null }[] = [
	{ label: "Never", days: null },
	{ label: "30 days", days: 30 },
	{ label: "90 days", days: 90 },
	{ label: "1 year", days: 365 },
];

const WINDOW_OPTIONS: { label: string; seconds: number }[] = [
	{ label: "1 min", seconds: 60 },
	{ label: "5 min", seconds: 300 },
	{ label: "15 min", seconds: 900 },
	{ label: "1 hour", seconds: 3600 },
	{ label: "1 day", seconds: 86_400 },
	{ label: "7 days", seconds: 604_800 },
];

function emptyCustom(): RateLimitCustomDraft {
	return {
		kind: "custom",
		requests: null,
		tokens: null,
		concurrency: null,
		spend: null,
	};
}

interface RelayKeyFormProps {
	value: RelayKeyDraft;
	onChange: (next: RelayKeyDraft) => void;
	nameDisabled?: boolean;
	nameError?: string;
}

export function RelayKeyForm({
	value,
	onChange,
	nameDisabled,
	nameError,
}: RelayKeyFormProps) {
	const expiryMode = useMemo<"none" | "preset" | "custom">(() => {
		if (value.expiresAt === null) return "none";
		const target = new Date(value.expiresAt).getTime();
		const now = Date.now();
		const diffDays = Math.round((target - now) / 86_400_000);
		if (EXPIRY_PRESETS.some((p) => p.days === diffDays)) return "preset";
		return "custom";
	}, [value.expiresAt]);

	const expiryPresetDays = useMemo(() => {
		if (value.expiresAt === null) return null;
		const target = new Date(value.expiresAt).getTime();
		const diffDays = Math.round((target - Date.now()) / 86_400_000);
		return EXPIRY_PRESETS.find((p) => p.days === diffDays)?.days ?? null;
	}, [value.expiresAt]);

	function setExpiryPreset(days: number | null) {
		if (days === null) {
			onChange({ ...value, expiresAt: null });
			return;
		}
		const next = new Date(Date.now() + days * 86_400_000).toISOString();
		onChange({ ...value, expiresAt: next });
	}

	function setExpiryCustomDate(yyyyMmDd: string) {
		if (!yyyyMmDd) {
			onChange({ ...value, expiresAt: null });
			return;
		}
		// midnight UTC of that date
		onChange({
			...value,
			expiresAt: new Date(`${yyyyMmDd}T00:00:00Z`).toISOString(),
		});
	}

	const rl = value.rateLimit;
	const rlMode = rl.kind;

	function setRlMode(mode: "none" | "ref" | "custom") {
		if (mode === rl.kind) return;
		if (mode === "none") onChange({ ...value, rateLimit: { kind: "none" } });
		else if (mode === "ref")
			onChange({ ...value, rateLimit: { kind: "ref", name: "" } });
		else if (mode === "custom")
			onChange({ ...value, rateLimit: emptyCustom() });
	}

	function patchRateLimit(next: RateLimitDraft) {
		onChange({ ...value, rateLimit: next });
	}

	const customDateValue =
		expiryMode === "custom" && value.expiresAt !== null
			? value.expiresAt.slice(0, 10)
			: "";

	return (
		<div className="flex flex-col gap-5">
			<Field label="Name">
				<Input
					type="text"
					value={value.name}
					disabled={nameDisabled}
					onChange={(e) => onChange({ ...value, name: e.currentTarget.value })}
					placeholder="prod-app"
					aria-invalid={nameError ? true : undefined}
				/>
				{nameError && (
					<p className="mt-1 text-[11px] text-destructive">{nameError}</p>
				)}
			</Field>

			<Field label="Expires">
				<div className="flex flex-wrap items-center gap-1.5">
					<Segmented
						value={
							expiryMode === "preset"
								? `p${expiryPresetDays}`
								: expiryMode === "none"
									? "p-null"
									: "custom"
						}
						options={[
							...EXPIRY_PRESETS.map((p) => ({
								value: `p${p.days}`,
								label: p.label,
							})),
							{ value: "custom", label: "Custom" },
						]}
						onChange={(v) => {
							if (v === "custom") {
								// initialize to +30d if not set
								const init =
									value.expiresAt ??
									new Date(Date.now() + 30 * 86_400_000).toISOString();
								onChange({ ...value, expiresAt: init });
							} else {
								const days = v === "p-null" ? null : Number(v.slice(1));
								setExpiryPreset(Number.isNaN(days) ? null : days);
							}
						}}
					/>
				</div>
				{expiryMode === "custom" && (
					<div className="mt-2 max-w-[200px]">
						<Input
							type="date"
							value={customDateValue}
							onChange={(e) => setExpiryCustomDate(e.currentTarget.value)}
						/>
					</div>
				)}
				<p className="mt-1 text-[11px] text-muted-foreground">
					After this date the key returns 401, like a revoke. No deletion.
				</p>
			</Field>

			<Field label="Rate limit">
				<Segmented
					value={rlMode}
					options={[
						{ value: "none", label: "None" },
						{ value: "ref", label: "Existing" },
						{ value: "custom", label: "Custom" },
					]}
					onChange={(v) => setRlMode(v as "none" | "ref" | "custom")}
				/>
				{rl.kind === "ref" && (
					<RateLimitRefPicker
						value={rl.name}
						onChange={(name) => patchRateLimit({ kind: "ref", name })}
					/>
				)}
				{rl.kind === "custom" && (
					<RateLimitCustomEditor draft={rl} onChange={patchRateLimit} />
				)}
				<p className="mt-1 text-[11px] text-muted-foreground">
					{rlMode === "none"
						? "No throttling. Requests are bound only by the key's policies and provider limits."
						: rlMode === "ref"
							? "Reuses a saved rate limit. Edit on the Rate Limits page."
							: "Saved as a rate limit attached to this key only."}
				</p>
			</Field>
		</div>
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

interface SegmentedProps {
	value: string;
	options: { value: string; label: string }[];
	onChange: (v: string) => void;
}

function Segmented({ value, options, onChange }: SegmentedProps) {
	return (
		<Tabs value={value} onValueChange={(v) => onChange(String(v))}>
			<TabsList>
				{options.map((o) => (
					<TabsTrigger key={o.value} value={o.value}>
						{o.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}

function RateLimitRefPicker({
	value,
	onChange,
}: {
	value: string;
	onChange: (name: string) => void;
}) {
	const { data, isLoading } = useQuery({
		...rateLimitsListQueryOptions,
		retry: false,
	});
	const items = (data?.items ?? []).filter((rl) => !isSystemOwned(rl));

	return (
		<div className="mt-2">
			<Select
				value={value || undefined}
				onValueChange={(v) => onChange(v ?? "")}
				disabled={isLoading}
			>
				<SelectTrigger className="w-full">
					<SelectValue
						placeholder={isLoading ? "Loading…" : "Select a rate limit"}
					/>
				</SelectTrigger>
				<SelectContent>
					{items.length === 0 ? (
						<div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
							No rate limits defined yet.
						</div>
					) : (
						items.map((rl) => (
							<SelectItem key={rl.metadata.name} value={rl.metadata.name}>
								{displayLabel(rl.metadata)}
							</SelectItem>
						))
					)}
				</SelectContent>
			</Select>
		</div>
	);
}

interface RateLimitCustomEditorProps {
	draft: RateLimitCustomDraft;
	onChange: (next: RateLimitCustomDraft) => void;
}

function RateLimitCustomEditor({
	draft,
	onChange,
}: RateLimitCustomEditorProps) {
	function patch(partial: Partial<RateLimitCustomDraft>) {
		onChange({ ...draft, ...partial });
	}

	return (
		<div className="mt-2 rounded-md border border-border bg-muted/40 p-3 flex flex-col gap-2">
			<MeterRow
				label="Requests"
				unit="reqs"
				rule={draft.requests}
				onChange={(r) => patch({ requests: r })}
			/>
			<MeterRow
				label="Tokens"
				unit="tokens"
				rule={draft.tokens}
				onChange={(r) => patch({ tokens: r })}
			/>
			<MeterRowConcurrency
				rule={draft.concurrency}
				onChange={(r) => patch({ concurrency: r })}
			/>
			<MeterRow
				label="Spend"
				prefix="$"
				rule={draft.spend}
				onChange={(r) => patch({ spend: r })}
			/>
		</div>
	);
}

function MeterRow({
	label,
	unit,
	prefix,
	rule,
	onChange,
}: {
	label: string;
	unit?: string;
	prefix?: string;
	rule: { amount: number; window: number } | null;
	onChange: (r: { amount: number; window: number } | null) => void;
}) {
	const enabled = rule !== null;
	const id = useId();
	return (
		<div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
			<label
				htmlFor={`${id}-on`}
				className="inline-flex items-center gap-2 cursor-pointer min-w-[100px]"
			>
				<input
					id={`${id}-on`}
					type="checkbox"
					checked={enabled}
					onChange={(e) =>
						onChange(
							e.currentTarget.checked
								? { amount: rule?.amount ?? 0, window: rule?.window ?? 60 }
								: null,
						)
					}
					className="h-3.5 w-3.5 accent-primary"
				/>
				<span className="text-xs font-medium text-foreground">{label}</span>
			</label>
			<div className="relative">
				{prefix && (
					<span
						className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${
							enabled ? "text-muted-foreground" : "text-muted-foreground/50"
						}`}
					>
						{prefix}
					</span>
				)}
				<Input
					type="number"
					min={0}
					inputMode="numeric"
					disabled={!enabled}
					value={rule?.amount ?? ""}
					placeholder="0"
					onChange={(e) => {
						const n = Number(e.currentTarget.value);
						if (!enabled) return;
						onChange({
							amount: Number.isFinite(n) ? n : 0,
							window: rule?.window ?? 60,
						});
					}}
					className={[prefix ? "pl-7" : "", unit ? "pr-14" : ""].join(" ")}
				/>
				{unit && (
					<span
						className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide pointer-events-none ${
							enabled ? "text-muted-foreground/70" : "text-muted-foreground/40"
						}`}
					>
						{unit}
					</span>
				)}
			</div>
			<div className="flex items-center gap-1.5">
				<span className="text-xs text-muted-foreground">per</span>
				<WindowSelect
					disabled={!enabled}
					seconds={rule?.window ?? 60}
					onChange={(s) => onChange({ amount: rule?.amount ?? 0, window: s })}
				/>
			</div>
		</div>
	);
}

function MeterRowConcurrency({
	rule,
	onChange,
}: {
	rule: { amount: number } | null;
	onChange: (r: { amount: number } | null) => void;
}) {
	const enabled = rule !== null;
	const id = useId();
	return (
		<div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
			<label
				htmlFor={`${id}-on`}
				className="inline-flex items-center gap-2 cursor-pointer min-w-[100px]"
			>
				<input
					id={`${id}-on`}
					type="checkbox"
					checked={enabled}
					onChange={(e) =>
						onChange(
							e.currentTarget.checked ? { amount: rule?.amount ?? 1 } : null,
						)
					}
					className="h-3.5 w-3.5 accent-primary"
				/>
				<span className="text-xs font-medium text-foreground">Concurrency</span>
			</label>
			<div className="relative">
				<Input
					type="number"
					min={0}
					inputMode="numeric"
					disabled={!enabled}
					value={rule?.amount ?? ""}
					placeholder="0"
					onChange={(e) => {
						const n = Number(e.currentTarget.value);
						if (!enabled) return;
						onChange({ amount: Number.isFinite(n) ? n : 0 });
					}}
					className="pr-16"
				/>
				<span
					className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide pointer-events-none ${
						enabled ? "text-muted-foreground/70" : "text-muted-foreground/40"
					}`}
				>
					in flight
				</span>
			</div>
			<span className="text-xs text-muted-foreground">no window</span>
		</div>
	);
}

function WindowSelect({
	seconds,
	onChange,
	disabled,
}: {
	seconds: number;
	onChange: (s: number) => void;
	disabled?: boolean;
}) {
	return (
		<Select
			value={String(seconds)}
			disabled={disabled}
			onValueChange={(v) => onChange(Number(v))}
		>
			<SelectTrigger className="min-w-[90px]">
				<SelectValue>
					{(v) =>
						WINDOW_OPTIONS.find((o) => String(o.seconds) === v)?.label ??
						`${v}s`
					}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{!WINDOW_OPTIONS.some((o) => o.seconds === seconds) && (
					<SelectItem value={String(seconds)}>{seconds}s</SelectItem>
				)}
				{WINDOW_OPTIONS.map((o) => (
					<SelectItem key={o.seconds} value={String(o.seconds)}>
						{o.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function emptyRelayKeyDraft(): RelayKeyDraft {
	return { name: "", expiresAt: null, rateLimit: { kind: "none" } };
}
