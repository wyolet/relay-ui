import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { MyAccountsView } from "@/accounts/MyAccountsView";
import { myAccountsQueryOptions } from "@/api/hooks/accounts";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/me/accounts")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(myAccountsQueryOptions),
	component: MyAccountsPage,
});

function MyAccountsPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<MyAccountsView />
		</Suspense>
	);
}
