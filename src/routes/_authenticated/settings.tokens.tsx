import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useAuth } from "@/api/auth";
import { authTokensQueryOptions, useAuthTokens } from "@/api/hooks/settings";
import { PageLoader } from "@/shared/Spinner";
import { TokenKeySections } from "@/tokens/TokenKeySections";
import {
	TokenSettingsForm,
	TokenSettingsHeader,
} from "@/tokens/TokenSettingsForm";

export const Route = createFileRoute("/_authenticated/settings/tokens")({
	// A refused read must not reach the route error boundary: a non-admin
	// without settings.read still gets the key and revoke guidance.
	loader: ({ context }) =>
		context.queryClient
			.ensureQueryData(authTokensQueryOptions)
			.catch(() => undefined),
	component: TokenSettingsPage,
});

function TokenSettingsEditor() {
	const { data } = useAuthTokens();
	return <TokenSettingsForm envelope={data} />;
}

function TokenSettingsReadOnly() {
	const { data, isPending } = useQuery(authTokensQueryOptions);
	if (isPending) return <PageLoader />;
	if (!data) {
		return (
			<div className="flex flex-col">
				<TokenSettingsHeader />
				<div className="mt-6 divide-y divide-border">
					<TokenKeySections isAdmin={false} />
				</div>
			</div>
		);
	}
	return <TokenSettingsForm envelope={data} readOnly />;
}

// Writing auth:tokens takes an admin: it decides whether tokens verify at all
// and how long a minted one may live.
function TokenSettingsPage() {
	const { isAdmin } = useAuth();
	return (
		<Suspense fallback={<PageLoader />}>
			{isAdmin ? <TokenSettingsEditor /> : <TokenSettingsReadOnly />}
		</Suspense>
	);
}
