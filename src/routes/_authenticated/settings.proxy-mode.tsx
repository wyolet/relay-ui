import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Boxes,
	ChevronLeft,
	Forward,
	type LucideIcon,
	Network,
	UserX,
} from "lucide-react";
import { Suspense } from "react";
import { modelsListQueryOptions, useModels } from "@/api/hooks/models";
import { MultiSelect } from "@/components/MultiSelect";
import { Switch } from "@/components/ui/switch";
import {
	type PassthroughTransport,
	usePassthroughStore,
} from "@/stores/passthrough";

export const Route = createFileRoute("/_authenticated/settings/proxy-mode")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(modelsListQueryOptions),
	component: PassthroughSettingsPage,
});

const TRANSPORTS: {
	value: PassthroughTransport;
	label: string;
	hint: string;
}[] = [
	{ value: "http", label: "HTTP", hint: "Standard request/response" },
	{ value: "ws", label: "WebSocket", hint: "Streaming bidirectional" },
	{ value: "amqp", label: "AMQP", hint: "Queued batch jobs" },
	{ value: "pubsub", label: "Pub/Sub", hint: "Fan-out events" },
];

function PassthroughSettingsInner() {
	const allowProxy = usePassthroughStore((s) => s.allowProxy);
	const allowUnauthenticated = usePassthroughStore(
		(s) => s.allowUnauthenticated,
	);
	const allowedModels = usePassthroughStore((s) => s.allowedModels);
	const allowedTransports = usePassthroughStore((s) => s.allowedTransports);
	const patch = usePassthroughStore((s) => s.patch);

	const { data } = useModels();
	const modelOptions = (data.items ?? []).map((m) => ({
		value: m.metadata.name,
		label: m.metadata.displayName ?? m.metadata.name,
	}));

	function toggleTransport(t: PassthroughTransport) {
		const next = allowedTransports.includes(t)
			? allowedTransports.filter((x) => x !== t)
			: [...allowedTransports, t];
		patch({ allowedTransports: next });
	}

	return (
		<div className="flex flex-col gap-4">
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
				<div className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-300">
					Frontend-only stash — backend persistence pending.
				</div>
			</div>

			<div className="divide-y divide-border">
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
							checked={allowProxy}
							onCheckedChange={(c) => patch({ allowProxy: c })}
							aria-label="Allow proxy mode"
						/>
						<span className="text-sm text-foreground">
							{allowProxy ? "Enabled" : "Disabled"}
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
							checked={allowUnauthenticated}
							onCheckedChange={(c) => patch({ allowUnauthenticated: c })}
							disabled={!allowProxy}
							aria-label="Allow unauthenticated"
						/>
						<span className="text-sm text-foreground">
							{allowUnauthenticated ? "Enabled" : "Disabled"}
						</span>
					</div>
					{!allowProxy && (
						<p className="mt-2 text-[11px] text-muted-foreground">
							Requires Allow proxy mode to be on.
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
						selected={allowedModels}
						onChange={(next) => patch({ allowedModels: next })}
						placeholder="Allow all"
						emptyHint="No models registered."
						aria-label="Allowed models"
						disabled={!allowProxy}
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
							const active = allowedTransports.includes(t.value);
							return (
								<button
									key={t.value}
									type="button"
									onClick={() => toggleTransport(t.value)}
									disabled={!allowProxy}
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
