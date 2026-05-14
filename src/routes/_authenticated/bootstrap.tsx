import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/bootstrap")({
	component: BootstrapPage,
});

function BootstrapPage() {
	return (
		<div className="max-w-2xl mx-auto py-12 px-6 text-center">
			<h1 className="text-2xl font-bold text-foreground mb-3">
				Bootstrap wizard
			</h1>
			<p className="text-sm text-muted-foreground mb-6">
				Providers and hosts are now seeded by the relay deployment. To start,
				create a host key and attach it to a policy.
			</p>
			<div className="flex items-center justify-center gap-3">
				<Link
					to="/host-keys/new"
					className="inline-flex items-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
				>
					Add a host key →
				</Link>
				<Link
					to="/policies"
					className="inline-flex items-center px-4 py-2 bg-card border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted"
				>
					Browse policies
				</Link>
			</div>
		</div>
	);
}
