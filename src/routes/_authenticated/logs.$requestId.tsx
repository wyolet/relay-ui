import { createFileRoute } from "@tanstack/react-router";
import { logDetailQueryOptions } from "@/api/hooks/logs";
import { LogDetailPanel } from "@/logs/LogDetailPanel";
import { useLogLabeler } from "@/logs/useLogsFilterOptions";
import { BackLink } from "@/shared/BackLink";

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
			<BackLink to="/logs">Back to logs</BackLink>
			<LogDetailPanel requestId={requestId} labelFor={labelFor} />
		</div>
	);
}
