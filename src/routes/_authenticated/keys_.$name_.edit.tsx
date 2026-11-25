import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { keyDetailQueryOptions, useKey } from "@/api/hooks/keys";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { KeyForm } from "@/keys/KeyForm";
import { displayLabel } from "@/lib/displayLabel";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/keys_/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(keyDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
		]),
	component: EditKeyPage,
});

function EditKeyInner() {
	const { name } = Route.useParams();
	const { data: rk } = useKey(name);
	const navigate = useNavigate();

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/keys/$name" params={{ name }}>
						{displayLabel(rk.metadata)}
					</BackLink>
				}
				title="Edit key"
				description="Change identity, expiry, or behavior flags. The secret is not changed — rotate by issuing a new key."
			/>
			<KeyForm
				apiKey={rk}
				onSaved={(savedName) =>
					void navigate({
						to: "/keys/$name",
						params: { name: savedName },
					})
				}
				onCancel={() => void navigate({ to: "/keys/$name", params: { name } })}
			/>
		</div>
	);
}

function EditKeyPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditKeyInner />
		</Suspense>
	);
}
