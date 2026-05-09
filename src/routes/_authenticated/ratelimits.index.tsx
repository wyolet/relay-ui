import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "@/api/hooks/ratelimits";
import type { RateLimit } from "@/api/types/ratelimit";
import type { ColumnDef } from "@/components/ResourceList";
import { ResourceList } from "@/components/ResourceList";

export const Route = createFileRoute("/_authenticated/ratelimits/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
	component: RateLimitsPage,
});

const COLUMNS: ColumnDef<RateLimit>[] = [
	{ key: "name", label: "Name", render: (r) => r.metadata.name },
	{ key: "strategy", label: "Strategy", render: (r) => r.spec.strategy },
	{ key: "window", label: "Window (s)", render: (r) => r.spec.window },
	{ key: "amount", label: "Amount", render: (r) => r.spec.amount },
	{ key: "source", label: "Source", render: (r) => r.spec.source ?? "—" },
];

function RateLimitsList() {
	const { data } = useRateLimits();
	return (
		<ResourceList
			title="Rate Limits"
			items={data.items ?? []}
			columns={COLUMNS}
			createTo="/ratelimits/new"
			detailTo={(name) => `/ratelimits/${name}`}
			getName={(r) => r.metadata.name}
			emptyMessage="No rate limits configured."
		/>
	);
}

function RateLimitsPage() {
	return (
		<Suspense
			fallback={
				<div className="text-muted-foreground text-sm">Loading…</div>
			}
		>
			<RateLimitsList />
		</Suspense>
	);
}
