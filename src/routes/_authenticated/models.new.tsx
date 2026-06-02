import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/_authenticated/models/new")({
	component: NewModelPage,
});

/**
 * Models are synced from providers — they aren't created by hand in the UI.
 * The route is kept so old links resolve to an explanation rather than a 404.
 */
function NewModelPage() {
	return (
		<div className="mx-auto mt-10 max-w-lg rounded-xl border border-border bg-card p-8 text-center">
			<Boxes
				className="mx-auto mb-3 size-7 text-muted-foreground/60"
				aria-hidden
			/>
			<h1 className="text-lg font-semibold text-foreground">
				Models are synced, not created
			</h1>
			<p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
				Models and their host bindings are provisioned from your providers and
				kept in sync automatically. There's nothing to create here.
			</p>
			<Link
				to="/models"
				className="mt-6 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
			>
				Back to models
			</Link>
		</div>
	);
}
