import type { Model } from "@/api/types/model";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { ModelDetailHeader } from "@/models/ModelDetailHeader";
import { ModelHostList } from "@/models/ModelHostList";
import { ModelPolicyList } from "@/models/ModelPolicyList";
import { ModelSpec } from "@/models/ModelSpec";
import { modelWeekScope } from "@/models/modelWeekQueries";
import { useModelHostLines } from "@/models/useModelHostLines";
import { useModelPolicies } from "@/models/useModelPolicies";
import { useModelProvider } from "@/models/useModelProvider";
import { WeekFigures } from "@/usage/WeekFigures";
import { WeekTraffic } from "@/usage/WeekTraffic";

interface Props {
	model: Model;
	onToggleEnabled: () => void;
	onDelete?: () => void;
	toggling?: boolean;
	deleting?: boolean;
}

/** One model on one page: its last 7 days, where it runs and at what price,
 * what it is, who may call it, and its latest requests. */
export function ModelDetailView({
	model,
	onToggleEnabled,
	onDelete,
	toggling,
	deleting,
}: Props) {
	const { name, id } = model.metadata;
	const provider = useModelProvider(model);
	const hostLines = useModelHostLines(name, id);
	const policies = useModelPolicies(name);

	return (
		<div className="grid grid-cols-1 gap-12">
			<div className="grid grid-cols-1 gap-8">
				<ModelDetailHeader
					model={model}
					provider={provider}
					onToggleEnabled={onToggleEnabled}
					onDelete={onDelete}
					toggling={toggling}
					deleting={deleting}
				/>
				<PlanIssuesPanel kind="model" id={id} />
				{id && (
					<WeekFigures
						scope={modelWeekScope(id)}
						emptyBody="Requests to this model show up here: spend, latency, errors and the hosts that served them."
					/>
				)}
			</div>

			<div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<div className="grid min-w-0 grid-cols-1 content-start gap-12">
					{id && <WeekTraffic scope={modelWeekScope(id)} />}
					<ModelHostList lines={hostLines} modelId={id} />
				</div>
				<ModelSpec model={model} />
			</div>

			<ModelPolicyList policies={policies} />
		</div>
	);
}
