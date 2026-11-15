import { Link } from "@tanstack/react-router";
import { useModelFigures } from "@/models/useModelFigures";
import { FigureRow } from "@/shared/FigureRow";
import { NO_TRAFFIC_ACTION, NoTraffic } from "@/shared/NoTraffic";

/** The model's last 7 days in headline figures, or one statement when it
 * had no traffic. */
export function ModelFigures({ modelId }: { modelId: string }) {
	const { hasTraffic, figures } = useModelFigures(modelId);
	if (!hasTraffic) {
		return (
			<NoTraffic
				title="No traffic in the last 7 days"
				actions={
					<Link
						to="/logs"
						search={{ model_id: [modelId], since: "30d" }}
						className={NO_TRAFFIC_ACTION}
					>
						Older requests in Logs →
					</Link>
				}
			>
				Requests to this model show up here: spend, latency, errors and the
				hosts that served them.
			</NoTraffic>
		);
	}
	return <FigureRow figures={figures} />;
}
