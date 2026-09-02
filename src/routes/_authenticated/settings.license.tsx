import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, ChevronLeft, KeySquare } from "lucide-react";
import { Suspense, useState } from "react";
import {
	type LicenseInfo,
	licenseQueryOptions,
	useInstallLicense,
	useLicense,
} from "@/api/hooks/license";
import { versionQueryOptions } from "@/api/queries/dashboard";
import { ApiError } from "@/api/types/errors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtTs } from "@/lib/format";
import { AlertBanner } from "@/shared/AlertBanner";
import { Chip } from "@/shared/Chip";
import { SettingsSection } from "@/shared/SettingsSection";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute("/_authenticated/settings/license")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(licenseQueryOptions),
	component: LicenseSettingsPage,
});

/** Go's zero time round-trips as 0001-01-01 rather than being omitted, so an
 * unlicensed deployment would otherwise render an expiry in year 1. */
function expiry(info: LicenseInfo): string | undefined {
	if (!info.expiresAt || info.expiresAt.startsWith("0001-")) return undefined;
	return info.expiresAt;
}

function LicenseState() {
	const { data: info } = useLicense();
	const { data: version } = useQuery(versionQueryOptions);
	const expiresAt = expiry(info);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<Chip
					label={info.licensed ? "Licensed" : "Community"}
					tone={info.licensed ? "primary" : "neutral"}
				/>
				{info.grace && <Chip label="Expired — in grace" />}
				{info.customer && <Chip label={info.customer} />}
				{expiresAt && <Chip label={`Expires ${fmtTs(expiresAt)}`} />}
			</div>

			<div>
				<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
					Features
				</div>
				<div className="mt-1.5 flex flex-wrap gap-1.5">
					{(info.features ?? []).length === 0 ? (
						<span className="text-xs text-muted-foreground">
							None — every gated feature is off. Community deployments keep
							password login and the built-in roles.
						</span>
					) : (
						(info.features ?? []).map((f) => (
							<Chip key={f} label={f} tone="primary" mono />
						))
					)}
				</div>
			</div>

			{version && (
				<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
					<span>Relay</span>
					<span className="font-mono">{version.version}</span>
					{version.license && (
						<span>
							· reports {version.license.licensed ? "licensed" : "community"}
						</span>
					)}
				</div>
			)}
		</div>
	);
}

function InstallLicense() {
	const install = useInstallLicense();
	const [value, setValue] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function handleInstall() {
		setError(null);
		try {
			await install.mutateAsync(value.trim());
			setValue("");
			toast("success", "License installed.");
		} catch (err) {
			// The relay verifies offline and answers 400 with why it refused;
			// show that verbatim rather than a generic failure.
			setError(
				err instanceof ApiError ? err.body.message : "Failed to install.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<Textarea
				value={value}
				onChange={(e) => setValue(e.target.value)}
				rows={5}
				spellCheck={false}
				placeholder="Paste the signed license file"
				aria-label="License file"
				aria-invalid={error ? true : undefined}
				className="font-mono text-[11px]"
			/>
			{error && <AlertBanner severity="error" title={error} />}
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="cta"
					onClick={handleInstall}
					disabled={install.isPending || value.trim().length === 0}
				>
					{install.isPending ? "Installing…" : "Install"}
				</Button>
				<span className="text-[11px] text-muted-foreground">
					RELAY_LICENSE_FILE / RELAY_LICENSE win over a value installed here.
				</span>
			</div>
		</div>
	);
}

function LicenseSettingsPage() {
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
				<h1 className="mt-2 text-xl font-semibold text-foreground">License</h1>
				<p className="mt-1 text-xs text-muted-foreground max-w-2xl">
					Relay runs unlicensed by default. A license unlocks the gated features
					— SSO login and authoring roles of your own — and nothing else
					changes.
				</p>
			</div>

			<div className="mt-6 divide-y divide-border">
				<SettingsSection
					icon={BadgeCheck}
					title="Current license"
					description="What this process verified at boot, or after the last install."
				>
					<Suspense fallback={<PageLoader />}>
						<LicenseState />
					</Suspense>
				</SettingsSection>

				<SettingsSection
					icon={KeySquare}
					title="Install a license"
					description="Verified offline and applied without a restart. An empty value clears the stored license."
				>
					<InstallLicense />
				</SettingsSection>
			</div>
		</div>
	);
}
