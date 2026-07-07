import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { hostKeyDetailQueryOptions, useHostKey } from "@/api/hooks/hostkeys";
import { HostKeyForm } from "@/host-keys/HostKeyForm";
import { displayLabel } from "@/lib/displayLabel";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/host-keys/$name_/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(hostKeyDetailQueryOptions(params.name)),
	component: EditHostKeyPage,
});

function EditHostKeyInner() {
	const { name } = Route.useParams();
	const { data: hk } = useHostKey(name);
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/host-keys/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(hk.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit credential
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Change identity or how Relay sources the credential. The slug stays
					the same.
				</p>
			</div>
			<HostKeyForm
				hostKey={hk}
				onSaved={(savedName) =>
					void navigate({
						to: "/host-keys/$name",
						params: { name: savedName },
					})
				}
				onCancel={() =>
					void navigate({ to: "/host-keys/$name", params: { name } })
				}
			/>
		</div>
	);
}

function EditHostKeyPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditHostKeyInner />
		</Suspense>
	);
}
