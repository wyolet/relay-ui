import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { hostKeyDetailQueryOptions, useHostKey } from "@/api/hooks/hostkeys";
import { HostKeyForm } from "@/host-keys/HostKeyForm";
import { displayLabel } from "@/lib/displayLabel";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
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
		<div>
			<PageHeader
				back={
					<BackLink to="/host-keys/$name" params={{ name }}>
						{displayLabel(hk.metadata)}
					</BackLink>
				}
				title="Edit credential"
				description="Change identity or how Relay sources the credential. The slug stays the same."
			/>
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
