import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { ModelsSyncedNotice } from "@/models/ModelsSyncedNotice";

export const Route = createFileRoute("/_authenticated/models/new")({
	component: NewModelPage,
});

function NewModelPage() {
	return (
		<ModelsSyncedNotice
			title="Models are synced, not created"
			action={
				<Link to="/models" className={buttonVariants()}>
					Back to models
				</Link>
			}
		>
			Models and their host bindings are provisioned from your providers and
			kept in sync automatically. There's nothing to create here.
		</ModelsSyncedNotice>
	);
}
