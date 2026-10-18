import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { Suspense } from "react";
import { PageLoader } from "@/shared/Spinner";
import { ExplorerBar } from "@/usage/explorer/ExplorerBar";
import { LatencyLens } from "@/usage/explorer/LatencyLens";
import { ReliabilityLens } from "@/usage/explorer/ReliabilityLens";
import { SpendLens } from "@/usage/explorer/SpendLens";
import {
	EXPLORER_DEFAULTS,
	explorerSearchSchema,
	type Lens,
} from "@/usage/explorer/search";
import { TokensLens } from "@/usage/explorer/TokensLens";
import { TrafficLens } from "@/usage/explorer/TrafficLens";

const LENS_VIEWS: Record<Lens, () => React.JSX.Element> = {
	traffic: TrafficLens,
	spend: SpendLens,
	tokens: TokensLens,
	reliability: ReliabilityLens,
	latency: LatencyLens,
};

export const Route = createFileRoute("/_authenticated/usage")({
	validateSearch: explorerSearchSchema,
	search: { middlewares: [stripSearchParams(EXPLORER_DEFAULTS)] },
	component: UsagePage,
});

function UsagePage() {
	const LensView = LENS_VIEWS[Route.useSearch().lens];
	return (
		<div className="grid gap-10">
			<ExplorerBar />
			<Suspense fallback={<PageLoader />}>
				<LensView />
			</Suspense>
		</div>
	);
}
