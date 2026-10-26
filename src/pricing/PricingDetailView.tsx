import { Link } from "@tanstack/react-router";
import { Banknote, Server } from "lucide-react";
import type { Pricing } from "@/api/types/pricing";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { MeterGrid } from "@/pricing/MeterGrid";
import { useHostOptionById } from "@/pricing/useHostOptions";
import { usePricingTargets } from "@/pricing/usePricingTargets";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { Section } from "@/shared/Section";
import { CatalogDetachedBadge, StatusBadge } from "@/shared/StatusBadge";

interface Props {
	pricing: Pricing;
	onDelete: () => void;
	onToggleEnabled: () => void;
	deleting?: boolean;
	toggling?: boolean;
}

export function PricingDetailView({
	pricing,
	onDelete,
	onToggleEnabled,
	deleting,
	toggling,
}: Props) {
	return (
		<div className="flex flex-col gap-12">
			<Header
				pricing={pricing}
				onDelete={onDelete}
				onToggleEnabled={onToggleEnabled}
				deleting={deleting}
				toggling={toggling}
			/>
			<RatesPanel pricing={pricing} />
			<TargetModelsPanel pricing={pricing} />
			<MetadataFooter pricing={pricing} />
		</div>
	);
}

function Header({
	pricing,
	onDelete,
	onToggleEnabled,
	deleting,
	toggling,
}: Props) {
	const name = pricing.metadata.name;
	const enabled = pricing.spec.enabled !== false;
	const hostOf = useHostOptionById();
	const host = pricing.metadata.owner?.id
		? hostOf(pricing.metadata.owner.id)
		: undefined;
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
					<Banknote
						className="w-4 h-4 text-muted-foreground shrink-0"
						aria-hidden
					/>
					{displayLabel(pricing.metadata)}
					{!hasDisplayName(pricing.metadata) && (
						<span className="text-[11px] text-muted-foreground font-normal">
							(no display name)
						</span>
					)}
					<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
						{pricing.spec.currency || "USD"}
					</span>
					<StatusBadge enabled={enabled} />
					<CatalogDetachedBadge
						detachedAt={pricing.metadata.catalogDetachedAt}
					/>
				</h1>
				<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
					{name}
				</p>
				{host && (
					<p className="mt-1 text-xs text-muted-foreground">
						<Link
							to="/hosts/$name"
							params={{ name: host.slug }}
							className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
						>
							<Server className="w-3 h-3" aria-hidden />
							Billed by {host.label}
						</Link>
					</p>
				)}
				{pricing.metadata.description && (
					<p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
						{pricing.metadata.description}
					</p>
				)}
			</div>
			<DetailHeaderActions
				enabled={enabled}
				onToggle={onToggleEnabled}
				toggling={toggling}
				onDelete={onDelete}
				deleting={deleting}
				editLink={({ className, content }) => (
					<Link
						to="/pricing/$name/edit"
						params={{ name }}
						className={className}
					>
						{content}
					</Link>
				)}
			/>
		</div>
	);
}

function RatesPanel({ pricing }: { pricing: Pricing }) {
	const rates = pricing.spec.rates ?? [];
	return (
		<Section title="Rates" meta={pricing.spec.currency || "USD"}>
			{rates.length === 0 ? (
				<p className="text-label text-ink-2">
					No rates defined: usage on the bindings this sheet covers counts as
					unpriced.
				</p>
			) : (
				<MeterGrid rates={rates} currency={pricing.spec.currency || "USD"} />
			)}
		</Section>
	);
}

function TargetModelsPanel({ pricing }: { pricing: Pricing }) {
	const targets = usePricingTargets(pricing);
	return (
		<Section
			title="Models"
			meta={`${targets.length} model${targets.length === 1 ? "" : "s"}`}
		>
			{targets.length === 0 ? (
				<p className="text-label text-ink-2">No target models.</p>
			) : (
				<ul className="grid max-w-2xl">
					{targets.map((t) => (
						<li
							key={t.id}
							className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 text-label last:border-b-0"
						>
							<Link
								to="/models/$name"
								params={{ name: t.slug }}
								className="truncate text-foreground hover:underline"
							>
								{t.label}
							</Link>
							{!t.served && (
								<span className="shrink-0 text-meta text-ink-3">
									not served by this host
								</span>
							)}
						</li>
					))}
				</ul>
			)}
		</Section>
	);
}

function MetadataFooter({ pricing }: { pricing: Pricing }) {
	const { createdAt, updatedAt } = pricing.metadata;
	if (!createdAt && !updatedAt) return null;
	return (
		<p className="text-meta text-ink-3">
			{createdAt && <>Created {new Date(createdAt).toLocaleString()}</>}
			{createdAt && updatedAt && " · "}
			{updatedAt && <>Updated {new Date(updatedAt).toLocaleString()}</>}
		</p>
	);
}
