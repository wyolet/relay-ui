import { Link } from "@tanstack/react-router";
import { Boxes, LayoutGrid, Server } from "lucide-react";
import type { Provider } from "@/api/types/provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutability } from "@/hooks/useMutability";
import { HostCell } from "@/hosts/HostCell";
import { modelFamily } from "@/lib/modelsByHost";
import { ModelsByFamily } from "@/models/ModelsByFamily";
import { ProviderLogo } from "@/providers/ProviderLogo";
import {
	type ProviderReferences,
	useProviderReferences,
} from "@/providers/useProviderReferences";
import { BackLink } from "@/shared/BackLink";
import { logoSize } from "@/shared/CatalogIcon";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader, type HeaderLink } from "@/shared/DetailPageHeader";
import { DetailTable, Td } from "@/shared/DetailTable";
import { EmptyState } from "@/shared/EmptyState";
import { Facts } from "@/shared/Facts";
import { StatCard, StatGrid } from "@/shared/StatCard";
import {
	CatalogDetachedBadge,
	OwnerBadge,
	StatusBadge,
} from "@/shared/StatusBadge";

export type ProviderDetailTab = "overview" | "models" | "hosts";

interface Props {
	provider: Provider;
	tab: ProviderDetailTab;
	onTabChange: (next: ProviderDetailTab) => void;
	onToggleEnabled: () => void;
	toggling?: boolean;
	onDelete: () => void;
	deleting?: boolean;
}

const TABS: {
	value: ProviderDetailTab;
	label: string;
	icon: typeof LayoutGrid;
}[] = [
	{ value: "overview", label: "Overview", icon: LayoutGrid },
	{ value: "models", label: "Models", icon: Boxes },
	{ value: "hosts", label: "Hosts", icon: Server },
];

export function ProviderDetailView({
	provider,
	tab,
	onTabChange,
	onToggleEnabled,
	toggling,
	onDelete,
	deleting,
}: Props) {
	const refs = useProviderReferences(provider);

	return (
		<div>
			<Header
				provider={provider}
				refs={refs}
				onToggleEnabled={onToggleEnabled}
				toggling={toggling}
				onDelete={onDelete}
				deleting={deleting}
			/>

			<Tabs
				value={tab}
				onValueChange={(v) =>
					onTabChange((v ?? "overview") as ProviderDetailTab)
				}
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
					<OverviewTab refs={refs} />
				</TabsContent>
				<TabsContent value="models">
					<ModelsByFamily
						models={refs.models}
						empty={
							<EmptyState
								icon={Boxes}
								title="No models from this provider"
								body="Once the provider's catalog syncs, models will appear here."
							/>
						}
					/>
				</TabsContent>
				<TabsContent value="hosts">
					<HostsTab refs={refs} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

/* ---------------- Header ---------------- */

function Header({
	provider,
	refs,
	onToggleEnabled,
	toggling,
	onDelete,
	deleting,
}: {
	provider: Provider;
	refs: ProviderReferences;
	onToggleEnabled: () => void;
	toggling?: boolean;
	onDelete: () => void;
	deleting?: boolean;
}) {
	const enabled = provider.spec.enabled !== false;
	const system = provider.metadata.owner?.kind === "system";
	const { canEdit, canDelete } = useMutability(provider.metadata, "provider");

	const links: HeaderLink[] = [
		{ href: provider.spec.docsURL, label: "Docs" },
		{ href: provider.spec.homepageURL, label: "Homepage" },
		{ href: provider.spec.statusPageURL, label: "Status" },
	];

	return (
		<DetailPageHeader
			back={<BackLink to="/models">Models</BackLink>}
			mark={<ProviderLogo provider={provider} size={logoSize.header} />}
			metadata={provider.metadata}
			badges={
				<>
					<StatusBadge enabled={enabled} />
					{system && <OwnerBadge label="System" title="System-managed." />}
					<CatalogDetachedBadge
						detachedAt={provider.metadata.catalogDetachedAt}
					/>
				</>
			}
			extra={
				<div className="mt-1.5">
					<Facts
						items={[
							{ label: "Models", value: refs.models.length },
							{ label: "Hosts", value: refs.hosts.length },
						]}
					/>
				</div>
			}
			links={links}
		>
			<DetailHeaderActions
				enabled={enabled}
				onToggle={onToggleEnabled}
				toggling={toggling}
				showToggle={canEdit}
				showDelete={canDelete}
				onDelete={onDelete}
				deleting={deleting}
			/>
		</DetailPageHeader>
	);
}

/* ---------------- Overview ---------------- */

function OverviewTab({ refs }: { refs: ProviderReferences }) {
	const enabledModels = refs.models.filter(
		(m) => m.spec.enabled !== false,
	).length;
	const families = new Set(refs.models.map(modelFamily));

	return (
		<div className="flex flex-col gap-6 pt-2">
			<StatGrid title="Overview" columns={3}>
				<StatCard
					label="Models"
					value={refs.models.length}
					sub={
						refs.models.length === 0
							? "none registered"
							: `${enabledModels} enabled`
					}
				/>
				<StatCard
					label="Families"
					value={families.size}
					sub={families.size === 0 ? "—" : "distinct"}
				/>
				<StatCard
					label="Hosts"
					value={refs.hosts.length}
					sub={refs.hosts.length === 0 ? "no host serves" : "serving"}
				/>
			</StatGrid>
		</div>
	);
}

/* ---------------- Hosts ---------------- */

const HOST_COLUMNS = [
	{ label: "Host" },
	{ label: "Models served", className: "text-right" },
];

function HostsTab({ refs }: { refs: ProviderReferences }) {
	if (refs.hosts.length === 0) {
		return (
			<EmptyState
				icon={Server}
				title="No host serves this provider's models"
				body="Add this provider's models to a host's catalog to start routing."
			/>
		);
	}
	return (
		<DetailTable columns={HOST_COLUMNS}>
			{refs.hosts.map((h) => {
				const count = refs.modelCountByHost.get(h.metadata.id ?? "") ?? 0;
				return (
					<tr
						key={h.metadata.name}
						className="hover:bg-muted/30 transition-colors"
					>
						<Td>
							<Link
								to="/hosts/$name"
								params={{ name: h.metadata.name }}
								className="block"
							>
								<HostCell host={h} size="sm" />
							</Link>
						</Td>
						<Td className="text-right tabular-nums">
							<span className="text-foreground">{count}</span>
						</Td>
					</tr>
				);
			})}
		</DetailTable>
	);
}
