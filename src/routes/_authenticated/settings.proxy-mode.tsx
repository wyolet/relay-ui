import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Forward, type LucideIcon, ShieldOff } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import {
	type ProxyMode,
	proxyModeQueryOptions,
	useProxyMode,
	useUpdateProxyMode,
} from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import { toast } from "@/components/Toast";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings/proxy-mode")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(proxyModeQueryOptions),
	component: ProxyModeSettingsPage,
});

interface FormState {
	enabled: boolean;
	allowUnauthenticated: boolean;
}

function envelopeToState(value: ProxyMode): FormState {
	return {
		enabled: value.enabled,
		allowUnauthenticated: value.allowUnauthenticated,
	};
}

function stateToValue(state: FormState): ProxyMode {
	return {
		enabled: state.enabled,
		allowUnauthenticated: state.allowUnauthenticated,
	};
}

function ProxyModeSettingsInner() {
	const { data: envelope } = useProxyMode();
	const updateProxyMode = useUpdateProxyMode();

	const initial = useMemo(() => envelopeToState(envelope.value), [envelope]);
	const [state, setState] = useState<FormState>(initial);

	function patch(next: Partial<FormState>) {
		setState((s) => ({ ...s, ...next }));
	}

	async function handleSave() {
		try {
			await updateProxyMode.mutateAsync(stateToValue(state));
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
					credentials. Relay still tracks usage and applies rate limits, but
					doesn't manage the secret.
				</p>
			</div>

			<div className="mt-6 divide-y divide-border">
				<Section
					icon={Forward}
					title="Enable proxy mode"
					description="Permit requests that already carry valid upstream auth headers."
				>
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
					icon={ShieldOff}
					title="Allow unauthenticated"
					description="Accept proxy-mode requests without a Relay key. Usage is still recorded, but cannot be attributed to a caller."
				>
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={state.allowUnauthenticated}
							onCheckedChange={(c) => patch({ allowUnauthenticated: c })}
							aria-label="Allow unauthenticated proxy requests"
							disabled={!state.enabled}
						/>
						<span className="text-sm text-foreground">
							{state.allowUnauthenticated ? "Allowed" : "Required"}
						</span>
					</div>
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
					disabled={updateProxyMode.isPending}
					className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground disabled:opacity-50"
				>
					{updateProxyMode.isPending ? "Saving…" : "Save changes"}
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

function ProxyModeSettingsPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<ProxyModeSettingsInner />
		</Suspense>
	);
}
