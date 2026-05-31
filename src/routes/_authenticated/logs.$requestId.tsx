import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { logDetailQueryOptions } from "@/api/hooks/logs";
import { LogDetailPanel } from "@/logs/LogDetailPanel";
import { useLogLabeler } from "@/logs/useLogsFilterOptions";

export const Route = createFileRoute("/_authenticated/logs/$requestId")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			logDetailQueryOptions(params.requestId),
		),
	component: LogDetailPage,
});

function LogDetailPage() {
	const { requestId } = Route.useParams();
	const labelFor = useLogLabeler();

	return (
		<div className="flex flex-col gap-4">
			<Link
				to="/logs"
				className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
			>
				<ChevronLeft className="size-3.5" aria-hidden="true" />
				Back to logs
			</Link>
			<div className="max-w-3xl">
				<LogDetailPanel requestId={requestId} labelFor={labelFor} />
			</div>
		</div>
	);
}
