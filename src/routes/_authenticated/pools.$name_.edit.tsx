import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { poolDetailQueryOptions, usePool } from "@/api/hooks/pools";
import { displayLabel } from "@/lib/displayLabel";
import { PoolForm } from "@/pools/PoolForm";
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
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/pools/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(pool.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit pool
				</h1>
			</div>
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
