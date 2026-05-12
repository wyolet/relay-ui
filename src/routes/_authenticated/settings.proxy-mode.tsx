import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Boxes,
	ChevronLeft,
	Forward,
	type LucideIcon,
	Network,
	UserX,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { modelsListQueryOptions, useModels } from "@/api/hooks/models";
import {
	type Passthrough,
	type PassthroughSpec,
	passthroughQueryOptions,
	usePassthrough,
	useUpdatePassthrough,
} from "@/api/hooks/passthrough";
import { ApiError } from "@/api/types/errors";
import { MultiSelect } from "@/components/MultiSelect";
import { toast } from "@/components/Toast";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings/proxy-mode")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(passthroughQueryOptions),
		]),
	component: PassthroughSettingsPage,
});

const TRANSPORTS: { value: string; label: string; hint: string }[] = [
	{ value: "http", label: "HTTP", hint: "Standard request/response" },
	{ value: "ws", label: "WebSocket", hint: "Streaming bidirectional" },
	{ value: "amqp", label: "AMQP", hint: "Queued batch jobs" },
	{ value: "pubsub", label: "Pub/Sub", hint: "Fan-out events" },
];

interface FormState {
	enabled: boolean;
	unauthenticatedEnabled: boolean;
	bucketBy: string;
	modelsAllow: string[];
	transports: string[];
}

function passthroughToState(p: Passthrough): FormState {
	return {
		enabled: p.spec.enabled,
		unauthenticatedEnabled: p.spec.unauthenticated.enabled,
		bucketBy: p.spec.unauthenticated.bucketBy ?? "",
		modelsAllow: p.spec.models.allow ?? [],
		transports: p.spec.transports ?? ["http"],
	};
}

function stateToSpec(state: FormState): PassthroughSpec {
	return {
		enabled: state.enabled,
		unauthenticated: {
			enabled: state.unauthenticatedEnabled,
			...(state.bucketBy ? { bucketBy: state.bucketBy } : {}),
		},
		models: {
			mode: state.modelsAllow.length > 0 ? "allowlist" : "all",
			...(state.modelsAllow.length > 0 ? { allow: state.modelsAllow } : {}),
		},
		transports: state.transports.length > 0 ? state.transports : null,
	};
}

function PassthroughSettingsInner() {
	const { data: passthrough } = usePassthrough();
	const { data: modelsData } = useModels();
	const updatePassthrough = useUpdatePassthrough();

	const initial = useMemo(() => passthroughToState(passthrough), [passthrough]);
	const [state, setState] = useState<FormState>(initial);

	const modelOptions = (modelsData.items ?? []).map((m) => ({
		value: m.metadata.name,
		label: m.metadata.displayName ?? m.metadata.name,
	}));

	function patch(next: Partial<FormState>) {
		setState((s) => ({ ...s, ...next }));
	}

	function toggleTransport(t: string) {
		const next = state.transports.includes(t)
			? state.transports.filter((x) => x !== t)
			: [...state.transports, t];
		patch({ transports: next });
	}

	async function handleSave() {
		try {
			await updatePassthrough.mutateAsync({
				...passthrough,
				spec: stateToSpec(state),
			});
			toast("success", "Proxy mode updated.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to save.",
			);
		}
	}

	function handleReset() {
		setState(initial);
	}

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
					Proxy mode
				</h1>
				<p className="mt-1 text-xs text-muted-foreground max-w-2xl">
					Accept requests where the caller brings their own upstream
					credentials. Relay still tracks usage, applies rate limits, and can
					translate schemas — but doesn't manage the secret. Useful for tools
					like Claude Code where you can't extract the OAuth token but want
					telemetry.
				</p>
			</div>

			<div className="mt-6 divide-y divide-border">
				<Section
					icon={Forward}
					title="Enable proxy mode"
					description="Permit requests that already carry valid upstream auth headers."
				>
					<p className="mb-2 text-sm text-muted-foreground">
						Relay forwards the request as-is to the configured upstream.
						Tracking and rate limits still apply; auth is not swapped.
					</p>
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={state.enabled}
							onCheckedChange={(c) => patch({ enabled: c })}
							aria-label="Enable proxy mode"
						/>
						<span className="text-sm text-foreground">
							{state.enabled ? "Enabled" : "Disabled"}
						</span>
					</div>
				</Section>

				<Section
					icon={UserX}
					title="Allow unauthenticated"
					description="Accept requests with no Relay key. Bucket usage by hash of the caller's upstream credential."
				>
					<p className="mb-2 text-sm text-muted-foreground">
						Off by default. Single-tenant deployments only — multi-tenant
						hierarchy isn't designed yet.
					</p>
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={state.unauthenticatedEnabled}
							onCheckedChange={(c) => patch({ unauthenticatedEnabled: c })}
							disabled={!state.enabled}
							aria-label="Allow unauthenticated"
						/>
						<span className="text-sm text-foreground">
							{state.unauthenticatedEnabled ? "Enabled" : "Disabled"}
						</span>
					</div>
					{!state.enabled && (
						<p className="mt-2 text-[11px] text-muted-foreground">
							Requires proxy mode to be on.
						</p>
					)}
				</Section>

				<Section
					icon={Boxes}
					title="Allowed models"
					description="Restrict which models proxy-mode callers can target."
				>
					<MultiSelect
						options={modelOptions}
						selected={state.modelsAllow}
						onChange={(next) => patch({ modelsAllow: next })}
						placeholder="Allow all"
						emptyHint="No models registered."
						aria-label="Allowed models"
						disabled={!state.enabled}
					/>
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						Empty = any registered model. Useful for capping cost on shared
						proxies.
					</p>
				</Section>

				<Section
					icon={Network}
					title="Allowed transports"
					description="Which protocols Relay will accept proxy-mode requests over."
				>
					<div className="flex flex-wrap gap-1.5">
						{TRANSPORTS.map((t) => {
							const active = state.transports.includes(t.value);
							return (
								<button
									key={t.value}
									type="button"
									onClick={() => toggleTransport(t.value)}
									disabled={!state.enabled}
									className={[
										"inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
										active
											? "bg-primary/10 text-primary border-primary/30"
											: "bg-card text-muted-foreground border-border hover:bg-muted",
									].join(" ")}
									title={t.hint}
								>
									{t.label}
								</button>
							);
						})}
					</div>
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						AMQP and Pub/Sub map to async batch jobs — Relay queues, the
						upstream gets HTTP, results return on the chosen transport.
					</p>
				</Section>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={handleReset}
					className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted"
				>
					Reset
				</button>
				<button
					type="button"
					onClick={handleSave}
					disabled={updatePassthrough.isPending}
					className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground disabled:opacity-50"
				>
					{updatePassthrough.isPending ? "Saving…" : "Save changes"}
				</button>
			</div>
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

function PassthroughSettingsPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<PassthroughSettingsInner />
		</Suspense>
	);
}
