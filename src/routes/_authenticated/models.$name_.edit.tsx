import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { ModelsSyncedNotice } from "@/models/ModelsSyncedNotice";

export const Route = createFileRoute("/_authenticated/models/$name_/edit")({
	component: EditModelPage,
});

function EditModelPage() {
	const { name } = Route.useParams();
	return (
		<ModelsSyncedNotice
			title="Models are synced, not edited"
			action={
				<Link to="/models/$name" params={{ name }} className={buttonVariants()}>
					Back to model
				</Link>
			}
		>
			Model metadata and host bindings are provisioned from your providers and
			kept in sync automatically. There's nothing to edit here.
		</ModelsSyncedNotice>
	);
}
