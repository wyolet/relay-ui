import {
	Activity,
	DollarSign,
	LayoutGrid,
	type LucideIcon,
	ScrollText,
	Server,
	Settings2,
	ShieldCheck,
} from "lucide-react";
import type { Model } from "@/api/types/model";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceLogs } from "@/logs/ResourceLogs";
import { ModelDetailHeader } from "@/models/ModelDetailHeader";
import { ComingSoon } from "@/models/ModelEmptyState";
import { ModelHostsTab } from "@/models/ModelHostsTab";
import { ModelLimitsTab } from "@/models/ModelLimitsTab";
import { ModelOverviewTab } from "@/models/ModelOverviewTab";
import { ModelPoliciesTab } from "@/models/ModelPoliciesTab";
import { ModelPricingTab } from "@/models/ModelPricingTab";
import { useHostsById } from "@/models/useHostsById";
import { useModelHosts } from "@/models/useModelHosts";
import { useModelPolicies } from "@/models/useModelPolicies";
import { useModelProvider } from "@/models/useModelProvider";
import { ResourceUsage } from "@/usage/ResourceUsage";

export type ModelDetailTab =
	| "overview"
	| "hosts"
	| "policies"
	| "limits"
	| "pricing"
	| "usage"
	| "logs";

interface Props {
	model: Model;
	tab: ModelDetailTab;
	onTabChange: (next: ModelDetailTab) => void;
	onToggleEnabled: () => void;
	onDelete?: () => void;
	toggling?: boolean;
	deleting?: boolean;
}

const TABS: {
	value: ModelDetailTab;
	label: string;
	icon: LucideIcon;
}[] = [
	{ value: "overview", label: "Overview", icon: LayoutGrid },
	{ value: "hosts", label: "Hosts", icon: Server },
	{ value: "policies", label: "Policies", icon: ShieldCheck },
	{ value: "limits", label: "Limits", icon: Settings2 },
	{ value: "pricing", label: "Pricing", icon: DollarSign },
	{ value: "usage", label: "Usage", icon: Activity },
	{ value: "logs", label: "Logs", icon: ScrollText },
];

export function ModelDetailView({
	model,
	tab,
	onTabChange,
	onToggleEnabled,
	onDelete,
	toggling,
	deleting,
}: Props) {
	const provider = useModelProvider(model);
	const hostRows = useModelHosts(model.metadata.name);
	const policyRows = useModelPolicies(model.metadata.name);
	const hostById = useHostsById();

	return (
		<div className="flex flex-col gap-5">
			<ModelDetailHeader
				model={model}
				provider={provider}
				onToggleEnabled={onToggleEnabled}
				onDelete={onDelete}
				toggling={toggling}
				deleting={deleting}
			/>

			<Tabs
				value={tab}
				onValueChange={(v) => onTabChange((v ?? "overview") as ModelDetailTab)}
			>
				<TabsList variant="underline">
					{TABS.map(({ value, label, icon: Icon }) => (
						<TabsTrigger key={value} value={value} className="px-3 h-9">
							<Icon className="w-3.5 h-3.5" aria-hidden />
							{label}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value="overview">
					<ModelOverviewTab
						model={model}
						hostRows={hostRows}
						policyRows={policyRows}
					/>
				</TabsContent>
				<TabsContent value="hosts">
					<ModelHostsTab rows={hostRows} hostById={hostById} />
				</TabsContent>
				<TabsContent value="policies">
					<ModelPoliciesTab rows={policyRows} />
				</TabsContent>
				<TabsContent value="limits">
					<ModelLimitsTab model={model} />
				</TabsContent>
				<TabsContent value="pricing">
					<ModelPricingTab
						model={model}
						hostRows={hostRows}
						hostById={hostById}
					/>
				</TabsContent>
				<TabsContent value="usage">
					{model.metadata.id ? (
						<ResourceUsage scope="model_id" id={model.metadata.id} />
					) : (
						<ComingSoon
							icon={Activity}
							title="Usage"
							body="Save this model to see its traffic."
						/>
					)}
				</TabsContent>
				<TabsContent value="logs">
					{model.metadata.id ? (
						<ResourceLogs
							scope="model_id"
							id={model.metadata.id}
							label="model"
						/>
					) : (
						<ComingSoon
							icon={ScrollText}
							title="Logs"
							body="Save this model to see the inference requests targeting it."
						/>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
