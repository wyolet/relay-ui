import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { HostKeyForm } from "@/components/HostKeyForm";

export const Route = createFileRoute("/_authenticated/host-keys/new")({
	component: NewHostKeyPage,
});

function NewHostKeyInner() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/keys"
					search={{ tab: "provider", filter: "active", q: "" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Host keys
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New host key
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Register an upstream credential — stored encrypted by Relay, or
					sourced from an environment variable on your deployment.
				</p>
			</div>
			<HostKeyForm
				onSaved={(name) =>
					void navigate({ to: "/host-keys/$name", params: { name } })
				}
				onCancel={() =>
					void navigate({
						to: "/keys",
						search: { tab: "provider", filter: "active", q: "" },
					})
				}
			/>
		</div>
	);
}

function NewHostKeyPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<NewHostKeyInner />
		</Suspense>
	);
}
