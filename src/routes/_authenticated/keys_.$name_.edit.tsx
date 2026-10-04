import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { keyDetailQueryOptions, useKey } from "@/api/hooks/keys";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { KeyForm } from "@/keys/KeyForm";
import { displayLabel } from "@/lib/displayLabel";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/keys_/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(keyDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: EditKeyPage,
});

function EditKeyInner() {
	const { name } = Route.useParams();
	const { data: rk } = useKey(name);
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/keys/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(rk.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">Edit key</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Change identity, policy binding, or behavior flags. The secret is not
					changed — rotate by issuing a new key.
				</p>
			</div>
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
