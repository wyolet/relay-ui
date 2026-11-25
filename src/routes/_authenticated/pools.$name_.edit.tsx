import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { poolDetailQueryOptions, usePool } from "@/api/hooks/pools";
import { displayLabel } from "@/lib/displayLabel";
import { PoolForm } from "@/pools/PoolForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/pools/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(poolDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
		]),
	component: EditPoolPage,
});

function EditPoolInner() {
	const { name } = Route.useParams();
	const { data: pool } = usePool(name);
	const navigate = useNavigate();
	const back = () => void navigate({ to: "/pools/$name", params: { name } });

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/pools/$name" params={{ name }}>
						{displayLabel(pool.metadata)}
					</BackLink>
				}
				title="Edit pool"
				description="Change its members, their order or how a request picks among them. The slug and host stay the same."
			/>
			<PoolForm
				pool={pool}
				onSaved={(savedName) =>
					void navigate({ to: "/pools/$name", params: { name: savedName } })
				}
				onCancel={back}
			/>
		</div>
	);
}

function EditPoolPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditPoolInner />
		</Suspense>
	);
}
