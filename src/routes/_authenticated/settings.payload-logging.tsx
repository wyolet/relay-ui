import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Ruler, ScrollText } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "@/api/auth";
import {
	type PayloadLogging,
	type PayloadLoggingEnvelope,
	payloadLoggingQueryOptions,
	usePayloadLogging,
	useUpdatePayloadLogging,
} from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertBanner } from "@/shared/AlertBanner";
import { NoAccessState } from "@/shared/RouteError";
import { SettingsSection } from "@/shared/SettingsSection";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute(
	"/_authenticated/settings/payload-logging",
)({
	// A refused read must not reach the route error boundary: the page shows
	// non-admins a no-access state, and an admin's error rethrows from the query.
	loader: ({ context }) =>
		context.queryClient
			.ensureQueryData(payloadLoggingQueryOptions)
			.catch(() => undefined),
	component: PayloadLoggingSettingsPage,
});

function PayloadLoggingSettingsForm({
	envelope,
	readOnly = false,
}: {
	envelope: PayloadLoggingEnvelope;
	readOnly?: boolean;
}) {
	const update = useUpdatePayloadLogging();

	// Preserve the storage backend config (file/s3/clickhouse) on save —
	// this page only edits the global on/off and the body-size cap.
	const base = envelope.value;
	const initial = useMemo(
		() => ({ enabled: base.enabled, maxBytes: base.maxBytes }),
		[base],
	);
	const [state, setState] = useState(initial);

	function patch(next: Partial<typeof state>) {
		setState((s) => ({ ...s, ...next }));
	}

	async function handleSave() {
		const value: PayloadLogging = {
			...base,
			enabled: state.enabled,
			maxBytes: state.maxBytes,
		};
		try {
			await update.mutateAsync(value);
			toast("success", "Payload logging updated.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to save.",
			);
		}
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
					Payload logging
				</h1>
				<p className="mt-1 text-xs text-muted-foreground max-w-2xl">
					Capture full request and response bodies for inspection under Logs.
					This is the global default — it overrides the per-policy and per-key
					toggles (global › policy › key). Bodies are stored via the{" "}
					<code className="font-mono">{base.backend || "—"}</code> backend
					configured on the relay.
				</p>
			</div>

			{readOnly && (
				<AlertBanner
					className="mt-4"
					severity="info"
					title="Only an admin can change payload logging"
				/>
			)}

			<div className="mt-6 divide-y divide-border">
				<SettingsSection
					icon={ScrollText}
					title="Capture payloads"
					description="When on, request/response bodies are captured for opted-in (or all, per policy/key) traffic and shown in the Logs inspector."
				>
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={state.enabled}
							onCheckedChange={(c) => patch({ enabled: c })}
							disabled={readOnly}
							aria-label="Enable payload logging"
						/>
						<span className="text-sm text-foreground">
							{state.enabled ? "Enabled" : "Disabled"}
						</span>
					</div>
				</SettingsSection>

				<SettingsSection
					icon={Ruler}
					title="Max body size"
					description="Bodies larger than this are truncated before storage. Bytes; 0 means no cap."
				>
					<div className="inline-flex items-center gap-2">
						<Input
							type="number"
							min={0}
							value={state.maxBytes}
							onChange={(e) =>
								patch({ maxBytes: Math.max(0, Number(e.target.value) || 0) })
							}
							disabled={readOnly || !state.enabled}
							className="w-40 tabular-nums"
						/>
						<span className="text-xs text-muted-foreground">bytes</span>
					</div>
				</SettingsSection>
			</div>

			{!readOnly && (
				<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="lg"
						onClick={() => setState(initial)}
					>
						Reset
					</Button>
					<Button
						type="button"
						variant="cta"
						size="lg"
						onClick={handleSave}
						disabled={update.isPending}
					>
						{update.isPending ? "Saving…" : "Save changes"}
					</Button>
				</div>
			)}
		</div>
	);
}

function PayloadLoggingSettingsEditor() {
	const { data } = usePayloadLogging();
	return <PayloadLoggingSettingsForm envelope={data} />;
}

function PayloadLoggingSettingsReadOnly() {
	const { data, isPending } = useQuery(payloadLoggingQueryOptions);
	if (isPending) return <PageLoader />;
	if (!data) {
		return (
			<NoAccessState
				title="Only admins can view payload logging"
				description="Ask an admin to review or change body capture."
			/>
		);
	}
	return <PayloadLoggingSettingsForm envelope={data} readOnly />;
}

// Writing payload-logging takes an admin: its S3 settings resolve credentials
// and send captured bodies to a destination the section itself names.
function PayloadLoggingSettingsPage() {
	const { isAdmin } = useAuth();
	return (
		<Suspense fallback={<PageLoader />}>
			{isAdmin ? (
				<PayloadLoggingSettingsEditor />
			) : (
				<PayloadLoggingSettingsReadOnly />
			)}
		</Suspense>
	);
}
