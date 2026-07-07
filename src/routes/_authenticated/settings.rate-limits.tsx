import { PageLoader } from "@/shared/Spinner";
/**
 * System rate limits — flat form for the four backend-owned RLs.
 * Hidden from /policies and PolicyForm pickers (see lib/systemRateLimits).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ChevronLeft,
	Globe,
	Lock,
	type LucideIcon,
	Plus,
	Settings as SettingsIcon,
	UserCheck,
	UserX,
	X,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { apiClient } from "@/api/client";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "@/api/hooks/ratelimits";
import { proxyModeQueryOptions, useProxyMode } from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import type { RateLimit, RateLimitRule } from "@/api/types/ratelimit";
import { unwrap } from "@/api/unwrap";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	isSystemRateLimitName,
	SYSTEM_RL_CONTROL,
	SYSTEM_RL_INFERENCE,
	SYSTEM_RL_INFERENCE_PROXY,
	SYSTEM_RL_INFERENCE_PROXY_ANON,
	type SystemRateLimitName,
} from "@/lib/systemRateLimits";
import { WINDOW_PRESETS } from "@/lib/timeWindow";
import { Switch } from "@/shared/Switch";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute("/_authenticated/settings/rate-limits")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(proxyModeQueryOptions),
		]),
	component: SystemRateLimitsPage,
});

const CONTROL_WINDOWS = [WINDOW_PRESETS[0], WINDOW_PRESETS[1]] as const;

interface RuleDraft {
	amount: string;
	windowSec: number;
	/** Free-form seconds vs a preset — lives on the draft so it survives row
	 * removal/reordering (rows are keyed by index). */
	isCustomWindow: boolean;
}

function isPresetWindow(windowSec: number): boolean {
	return WINDOW_PRESETS.some((w) => w.value === windowSec);
}

interface SectionState {
	enabled: boolean;
	rules: RuleDraft[];
}

interface FormState {
	control: SectionState;
	inference: SectionState;
	inferenceProxy: SectionState;
	inferenceProxyAnon: SectionState;
}

function ruleToDraft(r: RateLimitRule): RuleDraft {
	const w = r.window && r.window > 0 ? r.window : 60;
	return {
		amount: String(r.amount),
		windowSec: w,
		isCustomWindow: !isPresetWindow(w),
	};
}

function buildControlState(rl: RateLimit | undefined): SectionState {
	const defaults: RuleDraft[] = [
		{ amount: "100", windowSec: 1, isCustomWindow: false },
		{ amount: "1000", windowSec: 60, isCustomWindow: false },
	];
	if (!rl) return { enabled: false, rules: defaults };
	const existing = rl.spec.rules ?? [];
	const rules: RuleDraft[] = CONTROL_WINDOWS.map((w, i) => {
		const match = existing.find((r) => r.window === w.value);
		return match ? ruleToDraft(match) : defaults[i];
	});
	return { enabled: rl.spec.enabled !== false, rules };
}

function buildInferenceState(rl: RateLimit | undefined): SectionState {
	if (!rl) {
		return {
			enabled: false,
			rules: [{ amount: "60", windowSec: 60, isCustomWindow: false }],
		};
	}
	const existing = rl.spec.rules ?? [];
	const rules =
		existing.length > 0
			? existing.map(ruleToDraft)
			: [{ amount: "60", windowSec: 60, isCustomWindow: false }];
	return { enabled: rl.spec.enabled !== false, rules };
}

function buildInitial(rls: Map<string, RateLimit>): FormState {
	return {
		control: buildControlState(rls.get(SYSTEM_RL_CONTROL)),
		inference: buildInferenceState(rls.get(SYSTEM_RL_INFERENCE)),
		inferenceProxy: buildInferenceState(rls.get(SYSTEM_RL_INFERENCE_PROXY)),
		inferenceProxyAnon: buildInferenceState(
			rls.get(SYSTEM_RL_INFERENCE_PROXY_ANON),
		),
	};
}

function rulesEqual(a: RateLimitRule[], b: RateLimitRule[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		const x = a[i];
		const y = b[i];
		if (
			x.amount !== y.amount ||
			x.meter !== y.meter ||
			(x.strategy ?? "") !== (y.strategy ?? "") ||
			(x.window ?? 0) !== (y.window ?? 0)
		)
			return false;
	}
	return true;
}

function SystemRateLimitsInner() {
	const { data } = useRateLimits();
	const { data: proxyEnvelope } = useProxyMode();
	const allowProxy = proxyEnvelope.value.enabled;
	const allowUnauthenticated = proxyEnvelope.value.allowUnauthenticated;

	const rlByName = useMemo(() => {
		const map = new Map<string, RateLimit>();
		for (const rl of data.items ?? []) {
			if (isSystemRateLimitName(rl.metadata.name)) {
				map.set(rl.metadata.name, rl);
			}
		}
		return map;
	}, [data]);

	const initial = useMemo(() => buildInitial(rlByName), [rlByName]);
	const [state, setState] = useState<FormState>(initial);

	const queryClient = useQueryClient();
	const updateRL = useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: string;
			body: RateLimit;
		}): Promise<RateLimit> => {
			return unwrap(
				await apiClient.PUT("/rate-limits/by-id/{id}", {
					params: { path: { id } },
					body,
				}),
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["ratelimits"] });
		},
	});

	function patchSection<K extends keyof FormState>(
		key: K,
		next: Partial<SectionState>,
	) {
		setState((s) => ({ ...s, [key]: { ...s[key], ...next } }));
	}

	function updateRule(
		key: keyof FormState,
		idx: number,
		patch: Partial<RuleDraft>,
	) {
		setState((s) => ({
			...s,
			[key]: {
				...s[key],
				rules: s[key].rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
			},
		}));
	}

	function addRule(key: keyof FormState) {
		setState((s) => ({
			...s,
			[key]: {
				...s[key],
				rules: [
					...s[key].rules,
					{ amount: "60", windowSec: 60, isCustomWindow: false },
				],
			},
		}));
	}

	function removeRule(key: keyof FormState, idx: number) {
		setState((s) => ({
			...s,
			[key]: {
				...s[key],
				rules: s[key].rules.filter((_, i) => i !== idx),
			},
		}));
	}

	function sectionToRules(
		section: SectionState,
		existing: RateLimit | undefined,
	): RateLimitRule[] {
		const existingRules = existing?.spec.rules ?? [];
		const fallbackStrategy: RateLimitRule["strategy"] =
			existingRules[0]?.strategy ?? "token-bucket";
		return section.rules
			.map((r) => {
				const match = existingRules.find((er) => er.window === r.windowSec);
				return {
					amount: Number(r.amount),
					meter: "requests" as const,
					strategy: match?.strategy ?? fallbackStrategy,
					window: r.windowSec,
				};
			})
			.filter((r) => Number.isFinite(r.amount) && r.amount > 0);
	}

	async function saveOne(
		name: SystemRateLimitName,
		section: SectionState,
	): Promise<boolean> {
		const rl = rlByName.get(name);
		if (!rl) return false;
		const id = rl.metadata.id;
		if (!id) return false;
		const nextRules = sectionToRules(section, rl);
		const sameRules = rulesEqual(rl.spec.rules ?? [], nextRules);
		const sameEnabled = (rl.spec.enabled !== false) === section.enabled;
		if (sameRules && sameEnabled) return false;

		const payload: RateLimit = {
			...rl,
			spec: {
				...rl.spec,
				enabled: section.enabled,
				rules: nextRules,
			},
		};
		await updateRL.mutateAsync({ id, body: payload });
		return true;
	}

	async function handleSave() {
		const targets: [SystemRateLimitName, SectionState, boolean][] = [
			[SYSTEM_RL_CONTROL, state.control, true],
			[SYSTEM_RL_INFERENCE, state.inference, true],
			[SYSTEM_RL_INFERENCE_PROXY, state.inferenceProxy, allowProxy],
			[
				SYSTEM_RL_INFERENCE_PROXY_ANON,
				state.inferenceProxyAnon,
				allowProxy && allowUnauthenticated,
			],
		];
		let updated = 0;
		try {
			for (const [name, section, editable] of targets) {
				if (!editable) continue;
				const did = await saveOne(name, section);
				if (did) updated++;
			}
			if (updated === 0) {
				toast("success", "No changes to save.");
			} else {
				toast(
					"success",
					updated === 1
						? "1 rate limit updated."
						: `${updated} rate limits updated.`,
				);
			}
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to save changes.",
			);
		}
	}

	function reset() {
		setState(initial);
	}

	const proxyDisabledReason = !allowProxy
		? "Enable Proxy mode first."
		: undefined;
	const anonDisabledReason = !allowProxy
		? "Enable Proxy mode first."
		: !allowUnauthenticated
			? "Enable 'Allow unauthenticated' in Proxy mode first."
			: undefined;

	return (
		<div className="flex flex-col">
			<div>
				<Link
					to="/settings"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Settings
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					System rate limits
				</h1>
				<p className="mt-1 text-xs text-muted-foreground max-w-2xl">
					Throttling for Relay's own surfaces — the control API and the
					inference API. Only request rates are configurable here; meter and
					strategy are managed by the backend.
				</p>
			</div>

			<div className="mt-6 divide-y divide-border">
				<ControlSection
					rl={rlByName.get(SYSTEM_RL_CONTROL)}
					state={state.control}
					onToggle={(enabled) => patchSection("control", { enabled })}
					onAmountChange={(idx, amount) =>
						updateRule("control", idx, { amount })
					}
				/>

				<InferenceSection
					icon={Globe}
					title="Inference"
					description="Authenticated /v1/* traffic. Limits apply per relay key by default."
					rl={rlByName.get(SYSTEM_RL_INFERENCE)}
					state={state.inference}
					onToggle={(enabled) => patchSection("inference", { enabled })}
					onRuleChange={(idx, patch) => updateRule("inference", idx, patch)}
					onAddRule={() => addRule("inference")}
					onRemoveRule={(idx) => removeRule("inference", idx)}
				/>

				<InferenceSection
					icon={UserCheck}
					title="Inference (proxy mode)"
					description="Authenticated requests carrying upstream credentials directly. Active only when Proxy mode is enabled."
					rl={rlByName.get(SYSTEM_RL_INFERENCE_PROXY)}
					state={state.inferenceProxy}
					locked={!allowProxy}
					lockedReason={proxyDisabledReason}
					onToggle={(enabled) => patchSection("inferenceProxy", { enabled })}
					onRuleChange={(idx, patch) =>
						updateRule("inferenceProxy", idx, patch)
					}
					onAddRule={() => addRule("inferenceProxy")}
					onRemoveRule={(idx) => removeRule("inferenceProxy", idx)}
				/>

				<InferenceSection
					icon={UserX}
					title="Inference (anonymous proxy)"
					description="Unauthenticated proxy-mode traffic. Active only when 'Allow unauthenticated' is on."
					rl={rlByName.get(SYSTEM_RL_INFERENCE_PROXY_ANON)}
					state={state.inferenceProxyAnon}
					locked={!allowProxy || !allowUnauthenticated}
					lockedReason={anonDisabledReason}
					onToggle={(enabled) =>
						patchSection("inferenceProxyAnon", { enabled })
					}
					onRuleChange={(idx, patch) =>
						updateRule("inferenceProxyAnon", idx, patch)
					}
					onAddRule={() => addRule("inferenceProxyAnon")}
					onRemoveRule={(idx) => removeRule("inferenceProxyAnon", idx)}
				/>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={reset}
					className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted"
				>
					Reset
				</button>
				<button
					type="button"
					onClick={handleSave}
					disabled={updateRL.isPending}
					className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground disabled:opacity-50"
				>
					{updateRL.isPending ? "Saving…" : "Save changes"}
				</button>
			</div>
		</div>
	);
}

interface SectionShellProps {
	icon: LucideIcon;
	title: string;
	description: string;
	rl: RateLimit | undefined;
	enabled: boolean;
	onToggle: (next: boolean) => void;
	locked?: boolean;
	lockedReason?: string;
	children: React.ReactNode;
}

function SectionShell({
	icon: Icon,
	title,
	description,
	rl,
	enabled,
	onToggle,
	locked,
	lockedReason,
	children,
}: SectionShellProps) {
	const missing = !rl;
	return (
		<div
			className={[
				"grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 md:gap-8 py-8 first:pt-0 last:pb-0",
				locked ? "opacity-60" : "",
			].join(" ")}
		>
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
				{rl?.metadata.description && (
					<p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
						{rl.metadata.description}
					</p>
				)}
				<dl className="mt-3 space-y-1 text-[11px]">
					<MetaRow label="Name" value={rl?.metadata.name ?? "—"} mono />
					<MetaRow label="Owner" value="system" />
					<MetaRow label="Meter" value="requests" />
				</dl>
			</div>
			<div className="min-w-0">
				<div className="flex items-center justify-between mb-3">
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={enabled}
							onChange={onToggle}
							label={`Toggle ${title}`}
							disabled={missing || locked}
						/>
						<span className="text-sm text-foreground">
							{missing ? "Not configured" : enabled ? "Enabled" : "Disabled"}
						</span>
					</div>
					{locked && lockedReason && (
						<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
							<Lock className="w-3 h-3" />
							{lockedReason}
						</span>
					)}
				</div>
				<fieldset disabled={missing || locked || !enabled} className="contents">
					{children}
				</fieldset>
			</div>
		</div>
	);
}

function MetaRow({
	label,
	value,
	mono,
}: {
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<div className="flex gap-2">
			<dt className="text-muted-foreground w-14 shrink-0">{label}</dt>
			<dd
				className={[
					"text-foreground/80",
					mono ? "font-mono break-all" : "",
				].join(" ")}
			>
				{value}
			</dd>
		</div>
	);
}

interface ControlSectionProps {
	rl: RateLimit | undefined;
	state: SectionState;
	onToggle: (next: boolean) => void;
	onAmountChange: (idx: number, amount: string) => void;
}

function ControlSection({
	rl,
	state,
	onToggle,
	onAmountChange,
}: ControlSectionProps) {
	return (
		<SectionShell
			icon={SettingsIcon}
			title="Control API"
			description="All /control/* admin endpoints. RPS and RPM caps protect Relay's management plane."
			rl={rl}
			enabled={state.enabled}
			onToggle={onToggle}
		>
			<div className="flex flex-col gap-2">
				{state.rules.map((rule, idx) => {
					const window = CONTROL_WINDOWS[idx];
					return (
						<div
							key={window.short}
							className="grid grid-cols-[120px_1fr] gap-3 items-center rounded-md border border-border bg-card px-3 py-2.5"
						>
							<div>
								<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
									{window.short}
								</div>
								<div className="text-[11px] text-muted-foreground">
									{window.label}
								</div>
							</div>
							<Input
								type="number"
								min={1}
								inputMode="numeric"
								value={rule.amount}
								onChange={(e) => onAmountChange(idx, e.currentTarget.value)}
							/>
						</div>
					);
				})}
			</div>
		</SectionShell>
	);
}

interface InferenceSectionProps {
	icon: LucideIcon;
	title: string;
	description: string;
	rl: RateLimit | undefined;
	state: SectionState;
	onToggle: (next: boolean) => void;
	onRuleChange: (idx: number, patch: Partial<RuleDraft>) => void;
	onAddRule: () => void;
	onRemoveRule: (idx: number) => void;
	locked?: boolean;
	lockedReason?: string;
}

function InferenceSection({
	icon,
	title,
	description,
	rl,
	state,
	onToggle,
	onRuleChange,
	onAddRule,
	onRemoveRule,
	locked,
	lockedReason,
}: InferenceSectionProps) {
	return (
		<SectionShell
			icon={icon}
			title={title}
			description={description}
			rl={rl}
			enabled={state.enabled}
			onToggle={onToggle}
			locked={locked}
			lockedReason={lockedReason}
		>
			<div className="flex flex-col gap-2">
				{state.rules.map((rule, idx) => (
					<InferenceRuleRow
						// biome-ignore lint/suspicious/noArrayIndexKey: user-ordered with no stable id
						key={idx}
						rule={rule}
						canRemove={state.rules.length > 1}
						onChange={(patch) => onRuleChange(idx, patch)}
						onRemove={() => onRemoveRule(idx)}
					/>
				))}
				<button
					type="button"
					onClick={onAddRule}
					className="self-start inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-xs font-medium text-foreground hover:bg-muted"
				>
					<Plus className="w-3.5 h-3.5" />
					Add limit
				</button>
			</div>
		</SectionShell>
	);
}

interface InferenceRuleRowProps {
	rule: RuleDraft;
	canRemove: boolean;
	onChange: (patch: Partial<RuleDraft>) => void;
	onRemove: () => void;
}

function InferenceRuleRow({
	rule,
	canRemove,
	onChange,
	onRemove,
}: InferenceRuleRowProps) {
	const preset = WINDOW_PRESETS.find((w) => w.value === rule.windowSec);
	const custom = rule.isCustomWindow;
	const selectValue = custom
		? "custom"
		: String(preset?.value ?? rule.windowSec);
	return (
		<div className="grid grid-cols-[160px_120px_1fr_auto] gap-3 items-end rounded-md border border-border bg-card px-3 py-2.5">
			<div>
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
					Window
				</div>
				<Select
					value={selectValue}
					items={[
						...WINDOW_PRESETS.map((w) => ({
							value: String(w.value),
							label: w.label,
						})),
						{ value: "custom", label: "Custom…" },
					]}
					onValueChange={(v) => {
						if (v === null) return;
						if (v === "custom") {
							onChange({ isCustomWindow: true });
							return;
						}
						onChange({ windowSec: Number(v), isCustomWindow: false });
					}}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{WINDOW_PRESETS.map((w) => (
							<SelectItem key={w.value} value={String(w.value)}>
								{w.label}
							</SelectItem>
						))}
						<SelectItem value="custom">Custom…</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div>
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
					{custom ? "Seconds" : "Window"}
				</div>
				<Input
					type="number"
					min={1}
					inputMode="numeric"
					value={rule.windowSec}
					onChange={(e) =>
						onChange({ windowSec: Number(e.currentTarget.value) })
					}
					disabled={!custom}
				/>
			</div>
			<div>
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
					Requests
				</div>
				<Input
					type="number"
					min={1}
					inputMode="numeric"
					value={rule.amount}
					onChange={(e) => onChange({ amount: e.currentTarget.value })}
				/>
			</div>
			<button
				type="button"
				onClick={onRemove}
				disabled={!canRemove}
				aria-label="Remove limit"
				className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
			>
				<X className="w-3.5 h-3.5" />
			</button>
		</div>
	);
}

function SystemRateLimitsPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<SystemRateLimitsInner />
		</Suspense>
	);
}
