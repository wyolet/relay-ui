import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { NotFoundState } from "@/shared/RouteError";

export const Route = createFileRoute("/_authenticated/$")({
	component: NotFoundPage,
});

function NotFoundPage() {
	return (
		<NotFoundState
			body="No page lives at this address."
			action={
				<Link
					to="/"
					className={buttonVariants({ variant: "outline", size: "sm" })}
				>
					Go to the dashboard
				</Link>
			}
		/>
	);
}
