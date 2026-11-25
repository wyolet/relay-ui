import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { myContextsQueryOptions } from "@/api/hooks/contexts";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { Byok } from "@/byok/Byok";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/host-keys/byok")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(myContextsQueryOptions),
		]),
	component: ByokPage,
});

function ByokPage() {
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={<BackLink to="/accounts">Accounts</BackLink>}
				title="Bring your own key"
				description="A provider key, the account it belongs to, and who may use it, in one pass."
			/>
			<Suspense fallback={<PageLoader />}>
				<Byok onCancel={() => void navigate({ to: "/accounts" })} />
			</Suspense>
		</div>
	);
}
