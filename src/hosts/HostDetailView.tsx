import {
	Activity,
	Boxes,
	KeyRound,
	LayoutGrid,
	type LucideIcon,
	ShieldCheck,
	Sliders,
	Users,
} from "lucide-react";
import { Suspense } from "react";
import type { Host } from "@/api/types/host";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HostConfigurationTab } from "@/hosts/HostConfigurationTab";
import { HostCredentialsTab } from "@/hosts/HostCredentialsTab";
import { HostDetailHeader } from "@/hosts/HostDetailHeader";
import { HostModelsTab } from "@/hosts/HostModelsTab";
import { HostOverviewTab } from "@/hosts/HostOverviewTab";
import { HostTierPresets } from "@/hosts/HostTierPresets";
import { HostUserPoliciesTab } from "@/hosts/HostUserPoliciesTab";
import { HOST_NO_TRAFFIC, hostWeekScope } from "@/hosts/hostWeekUsage";
import { EmptyState } from "@/shared/EmptyState";
import { PageLoader } from "@/shared/Spinner";
import { WeekUsage } from "@/usage/WeekUsage";

export type HostDetailTab =
	| "overview"
	| "configuration"
	| "host-policies"
	| "user-policies"
	| "host-keys"
	| "models"
	| "usage";

interface Props {
	host: Host;
	tab: HostDetailTab;
	onTabChange: (next: HostDetailTab) => void;
	onToggleEnabled: () => void;
	toggling?: boolean;
	onDelete: () => void;
	deleting?: boolean;
}

const TABS: {
	value: HostDetailTab;
	label: string;
	icon: LucideIcon;
}[] = [
	{ value: "overview", label: "Overview", icon: LayoutGrid },
	{ value: "configuration", label: "Configuration", icon: Sliders },
	{ value: "host-policies", label: "Tier presets", icon: ShieldCheck },
	{ value: "user-policies", label: "User policies", icon: Users },
	{ value: "host-keys", label: "Credentials", icon: KeyRound },
	{ value: "models", label: "Models", icon: Boxes },
	{ value: "usage", label: "Usage", icon: Activity },
];

export function HostDetailView({
	host,
	tab,
	onTabChange,
	onToggleEnabled,
	toggling,
	onDelete,
	deleting,
}: Props) {
	return (
		<div>
			<HostDetailHeader
				host={host}
				onToggleEnabled={onToggleEnabled}
				toggling={toggling}
				onDelete={onDelete}
				deleting={deleting}
			/>

			{/* Each tab reads its own reference lists inside its own Suspense, so the
			    header and tab bar paint without waiting on them. */}
			<Tabs
				value={tab}
				onValueChange={(v) => onTabChange((v ?? "overview") as HostDetailTab)}
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
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<HostOverviewTab host={host} />
					</Suspense>
				</TabsContent>
				<TabsContent value="configuration">
					<HostConfigurationTab host={host} />
				</TabsContent>
				<TabsContent value="host-policies">
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<HostTierPresets
							hostName={host.metadata.name}
							empty={
								<EmptyState
									icon={ShieldCheck}
									title="No tier presets"
									body="This host owns no policies. Bind your own tier policy to an account to cap its keys."
								/>
							}
						/>
					</Suspense>
				</TabsContent>
				<TabsContent value="user-policies">
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<HostUserPoliciesTab host={host} />
					</Suspense>
				</TabsContent>
				<TabsContent value="host-keys">
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<HostCredentialsTab host={host} />
					</Suspense>
				</TabsContent>
				<TabsContent value="models">
					<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
						<HostModelsTab host={host} />
					</Suspense>
				</TabsContent>
				<TabsContent value="usage">
					{host.metadata.id ? (
						<div className="pt-2">
							<WeekUsage
								scope={hostWeekScope(host.metadata.id)}
								emptyBody={HOST_NO_TRAFFIC}
							/>
						</div>
					) : (
						<EmptyState
							icon={Activity}
							title="Usage"
							body="Save this host to see its traffic."
							comingSoon
						/>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
