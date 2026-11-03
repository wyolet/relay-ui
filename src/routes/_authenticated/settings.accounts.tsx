import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { Suspense, useState } from "react";
import { useAuth } from "@/api/auth";
import {
	type AccountsSettings,
	type AccountsSettingsEnvelope,
	accountsSettingsQueryOptions,
	useAccountsSettings,
	useUpdateAccountsSettings,
} from "@/api/hooks/settings";
import { ApiError } from "@/api/types/errors";
import { Switch } from "@/components/ui/switch";
import { AlertBanner } from "@/shared/AlertBanner";
import { NoAccessState } from "@/shared/RouteError";
import { SettingsPageHeader, SettingsSaveBar } from "@/shared/SettingsPage";
import { SettingsSection } from "@/shared/SettingsSection";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute("/_authenticated/settings/accounts")({
	// A refused read must not reach the route error boundary: the page shows
	// non-admins a no-access state, and an admin's error rethrows from the query.
	loader: ({ context }) =>
		context.queryClient
			.ensureQueryData(accountsSettingsQueryOptions)
			.catch(() => undefined),
	component: AccountsSettingsPage,
});

function AccountsSettingsForm({
	envelope,
	readOnly = false,
}: {
	envelope: AccountsSettingsEnvelope;
	readOnly?: boolean;
}) {
	const update = useUpdateAccountsSettings();
	const initial = envelope.value;
	const [state, setState] = useState<AccountsSettings>(initial);

	async function handleSave() {
		try {
			await update.mutateAsync(state);
			toast("success", "Accounts settings updated.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to save.",
			);
		}
	}

	const on = state.personalAccounts === "on";

	return (
		<div className="flex flex-col">
			<SettingsPageHeader title="Accounts">
				The accounts relay keeps for users. A user's own setting wins, then
				their groups' (off wins over on), then this deployment default.
			</SettingsPageHeader>

			{readOnly && (
				<AlertBanner
					className="mt-4"
					severity="info"
					title="Only an admin can change accounts settings"
				/>
			)}

			<div className="mt-6 divide-y divide-border">
				<SettingsSection
					icon={UserRound}
					title="Personal accounts"
					description="When off, personal accounts and the provider accounts users own close, and users act only through their teams, projects and service accounts. Nothing is deleted; turning it back on restores them."
				>
					<div className="inline-flex items-center gap-2.5">
						<Switch
							checked={on}
							onCheckedChange={(c) =>
								setState({ ...state, personalAccounts: c ? "on" : "off" })
							}
							disabled={readOnly}
							aria-label="Personal accounts"
						/>
						<span className="text-sm text-foreground">{on ? "On" : "Off"}</span>
					</div>
				</SettingsSection>
			</div>

			{!readOnly && (
				<SettingsSaveBar
					onReset={() => setState(initial)}
					onSave={handleSave}
					saving={update.isPending}
				/>
			)}
		</div>
	);
}

function AccountsSettingsEditor() {
	const { data } = useAccountsSettings();
	return <AccountsSettingsForm envelope={data} />;
}

function AccountsSettingsReadOnly() {
	const { data, isPending } = useQuery(accountsSettingsQueryOptions);
	if (isPending) return <PageLoader />;
	if (!data) {
		return (
			<NoAccessState
				title="Only admins can view accounts settings"
				description="Ask an admin whether users get personal accounts."
			/>
		);
	}
	return <AccountsSettingsForm envelope={data} readOnly />;
}

function AccountsSettingsPage() {
	const { isAdmin } = useAuth();
	return (
		<Suspense fallback={<PageLoader />}>
			{isAdmin ? <AccountsSettingsEditor /> : <AccountsSettingsReadOnly />}
		</Suspense>
	);
}
