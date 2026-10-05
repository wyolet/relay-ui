import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, KeyRound, LogIn, UserPlus } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "@/api/auth";
import { isLicenseRequired } from "@/api/hooks/license";
import {
	type AuthOIDC,
	type AuthOIDCEnvelope,
	authOIDCQueryOptions,
	useAuthOIDC,
	useUpdateAuthOIDC,
} from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertBanner } from "@/shared/AlertBanner";
import { NoAccessState } from "@/shared/RouteError";
import { SettingsSection } from "@/shared/SettingsSection";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute("/_authenticated/settings/sso")({
	// A refused read must not reach the route error boundary: the page shows
	// non-admins a no-access state, and an admin's error rethrows from the query.
	loader: ({ context }) =>
		context.queryClient
			.ensureQueryData(authOIDCQueryOptions)
			.catch(() => undefined),
	component: SsoSettingsPage,
});

const REGISTRATION = [
	{ value: "closed", label: "Closed — only existing users may sign in" },
	{ value: "open", label: "Open — create a user on first sign-in" },
];

interface FormState {
	enabled: boolean;
	issuer: string;
	clientId: string;
	clientSecretEnv: string;
	redirectUrl: string;
	postLoginUrl: string;
	registration: string;
}

function toState(value: AuthOIDC): FormState {
	return {
		enabled: value.enabled,
		issuer: value.issuer ?? "",
		clientId: value.clientId ?? "",
		clientSecretEnv: value.clientSecretEnv ?? "",
		redirectUrl: value.redirectUrl ?? "",
		postLoginUrl: value.postLoginUrl ?? "",
		registration: value.registration || "closed",
	};
}

function SsoSettingsForm({
	envelope,
	readOnly = false,
}: {
	envelope: AuthOIDCEnvelope;
	readOnly?: boolean;
}) {
	const update = useUpdateAuthOIDC();

	const initial = useMemo(() => toState(envelope.value), [envelope]);
	const [state, setState] = useState<FormState>(initial);
	const [licenseNeeded, setLicenseNeeded] = useState(false);

	function patch(next: Partial<FormState>) {
		setState((s) => ({ ...s, ...next }));
	}

	async function handleSave() {
		setLicenseNeeded(false);
		try {
			// PUT replaces the whole section: spread the stored value so scopes,
			// authParams and groupsClaim survive an edit made from this page.
			await update.mutateAsync({ ...envelope.value, ...state });
			toast("success", "SSO settings updated.");
		} catch (err) {
			if (isLicenseRequired(err)) {
				setLicenseNeeded(true);
				return;
			}
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
				<h1 className="mt-2 text-xl font-semibold text-foreground">SSO</h1>
				<p className="mt-1 text-xs text-muted-foreground max-w-2xl">
					Sign operators in through your identity provider (generic OIDC: issuer
					discovery plus the authorization-code flow). Password login keeps
					working alongside it.
				</p>
			</div>

			{readOnly && (
				<AlertBanner
					className="mt-4"
					severity="info"
					title="Only an admin can change SSO settings"
				/>
			)}

			{licenseNeeded && (
				<AlertBanner
					className="mt-4"
					severity="warn"
					title="SSO login needs a license"
				>
					<p className="text-xs text-muted-foreground">
						The relay refused to enable OIDC on this deployment.{" "}
						<Link
							to="/settings/license"
							className="underline hover:text-foreground"
						>
							Install a license
						</Link>{" "}
						and save again — password login is unaffected either way.
					</p>
				</AlertBanner>
			)}

			<div className="mt-6 divide-y divide-border">
				<SettingsSection
					icon={LogIn}
					title="Enable SSO"
					description="Offer the provider on the login page. Requires issuer, client id and callback below."
				>
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={state.enabled}
							onCheckedChange={(c) => patch({ enabled: c })}
							disabled={readOnly}
							aria-label="Enable SSO login"
						/>
						<span className="text-sm text-foreground">
							{state.enabled ? "Enabled" : "Disabled"}
						</span>
					</div>
				</SettingsSection>

				<SettingsSection
					icon={KeyRound}
					title="Provider"
					description="Discovery runs against the issuer's metadata document. The client secret stays in the environment — only its variable name is stored."
				>
					<div className="flex flex-col gap-3 max-w-md">
						<Field
							id="issuer"
							label="Issuer URL"
							value={state.issuer}
							placeholder="https://idp.example.com"
							readOnly={readOnly}
							onChange={(v) => patch({ issuer: v })}
						/>
						<Field
							id="clientId"
							label="Client id"
							value={state.clientId}
							readOnly={readOnly}
							onChange={(v) => patch({ clientId: v })}
						/>
						<Field
							id="clientSecretEnv"
							label="Client secret env var"
							value={state.clientSecretEnv}
							placeholder="RELAY_OIDC_CLIENT_SECRET"
							readOnly={readOnly}
							onChange={(v) => patch({ clientSecretEnv: v })}
						/>
						<Field
							id="redirectUrl"
							label="Callback URL"
							value={state.redirectUrl}
							placeholder="https://relay.example.com/api/auth/oidc/callback"
							readOnly={readOnly}
							onChange={(v) => patch({ redirectUrl: v })}
						/>
						<Field
							id="postLoginUrl"
							label="Post-login URL"
							value={state.postLoginUrl}
							placeholder="Empty — stay on this origin"
							readOnly={readOnly}
							onChange={(v) => patch({ postLoginUrl: v })}
						/>
					</div>
				</SettingsSection>

				<SettingsSection
					icon={UserPlus}
					title="Registration"
					description="Whether a subject with no user row is provisioned on first sign-in."
				>
					<Select
						value={state.registration}
						items={REGISTRATION}
						onValueChange={(v) => patch({ registration: v ?? "closed" })}
						disabled={readOnly}
					>
						<SelectTrigger className="w-full max-w-md">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{REGISTRATION.map((r) => (
								<SelectItem key={r.value} value={r.value}>
									{r.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
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

function Field({
	id,
	label,
	value,
	placeholder,
	readOnly,
	onChange,
}: {
	id: string;
	label: string;
	value: string;
	placeholder?: string;
	readOnly: boolean;
	onChange: (value: string) => void;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				value={value}
				placeholder={placeholder}
				spellCheck={false}
				readOnly={readOnly}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	);
}

function SsoSettingsEditor() {
	const { data } = useAuthOIDC();
	return <SsoSettingsForm envelope={data} />;
}

function SsoSettingsReadOnly() {
	const { data, isPending } = useQuery(authOIDCQueryOptions);
	if (isPending) return <PageLoader />;
	if (!data) {
		return (
			<NoAccessState
				title="Only admins can view SSO settings"
				description="Ask an admin to review or change how operators sign in."
			/>
		);
	}
	return <SsoSettingsForm envelope={data} readOnly />;
}

// Writing auth:oidc takes an admin: it names where the client secret is read
// from, which a non-admin could otherwise point at another credential.
function SsoSettingsPage() {
	const { isAdmin } = useAuth();
	return (
		<Suspense fallback={<PageLoader />}>
			{isAdmin ? <SsoSettingsEditor /> : <SsoSettingsReadOnly />}
		</Suspense>
	);
}
