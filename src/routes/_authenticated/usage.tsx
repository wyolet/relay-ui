import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { Suspense } from "react";
import { PageLoader } from "@/shared/Spinner";
import { ExplorerBar } from "@/usage/explorer/ExplorerBar";
import { SpendLens } from "@/usage/explorer/SpendLens";
import {
	EXPLORER_DEFAULTS,
	explorerSearchSchema,
} from "@/usage/explorer/search";
import { TrafficLens } from "@/usage/explorer/TrafficLens";

export const Route = createFileRoute("/_authenticated/usage")({
	validateSearch: explorerSearchSchema,
	search: { middlewares: [stripSearchParams(EXPLORER_DEFAULTS)] },
	component: UsagePage,
});

function UsagePage() {
	const { lens } = Route.useSearch();
	return (
		<div className="grid gap-10">
			<ExplorerBar />
			<Suspense fallback={<PageLoader />}>
				{lens === "spend" ? <SpendLens /> : <TrafficLens />}
			</Suspense>
		</div>
	);
}
