import { Link } from "@tanstack/react-router";
import type { Pricing } from "@/api/types/pricing";
import { displayLabel } from "@/lib/displayLabel";
import { MeterGrid } from "@/pricing/MeterGrid";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { FigureRow } from "@/shared/FigureRow";
import { Section } from "@/shared/Section";
import { CatalogDetachedBadge } from "@/shared/StatusBadge";
import { type PricingTarget, usePricingDetail } from "./usePricingDetail";

interface Props {
	pricing: Pricing;
	onDelete: () => void;
	onToggleEnabled: () => void;
	deleting?: boolean;
	toggling?: boolean;
}

const MODEL_GRID =
	"grid grid-cols-[minmax(10rem,1fr)_6rem_6rem] items-baseline gap-x-5";

export function PricingDetailView({
	pricing,
	onDelete,
	onToggleEnabled,
	deleting,
	toggling,
}: Props) {
	const { host, targets, figures } = usePricingDetail(pricing);
	const name = pricing.metadata.name;
	const enabled = pricing.spec.enabled !== false;
	const currency = pricing.spec.currency || "USD";
	const rates = pricing.spec.rates ?? [];

	return (
		<div className="grid gap-14">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0">
					<h1 className="truncate text-2xl font-bold text-foreground">
						{displayLabel(pricing.metadata)}
					</h1>
					<p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-label text-ink-2">
						<span className="font-mono text-meta text-ink-3">{name}</span>
						<span aria-hidden>·</span>
						{host ? (
							<Link
								to="/hosts/$name"
								params={{ name: host.slug }}
								className="hover:text-foreground hover:underline"
							>
								Billed by {host.label}
							</Link>
						) : (
							<span>No host</span>
						)}
						<span aria-hidden>·</span>
						<span className={enabled ? undefined : "text-foreground"}>
							{enabled ? "Enabled" : "Disabled: prices nothing"}
						</span>
						<CatalogDetachedBadge
							detachedAt={pricing.metadata.catalogDetachedAt}
						/>
					</p>
					{pricing.metadata.description && (
						<p className="mt-2 max-w-2xl text-label text-ink-2">
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

			<FigureRow figures={figures} />

			<Section title="Rates" meta={currency}>
				{rates.length === 0 ? (
					<p className="text-label text-ink-2">
						No rates defined: usage on the bindings this sheet covers counts as
						unpriced.
					</p>
				) : (
					<MeterGrid rates={rates} currency={currency} />
				)}
			</Section>

			<Section
				title="Models"
				meta={`${targets.length} model${targets.length === 1 ? "" : "s"}, last 7 days`}
			>
				{targets.length === 0 ? (
					<p className="text-label text-ink-2">No target models.</p>
				) : (
					<div className="max-w-3xl">
						<div
							className={`${MODEL_GRID} border-b border-rule pb-2 text-meta text-ink-3`}
						>
							<span>Model</span>
							<span className="text-right">Requests</span>
							<span className="text-right">Est. spend</span>
						</div>
						{targets.map((t) => (
							<TargetLine key={t.id} target={t} />
						))}
					</div>
				)}
			</Section>

			<MetadataFooter pricing={pricing} />
		</div>
	);
}

function TargetLine({ target }: { target: PricingTarget }) {
	return (
		<div
			className={`${MODEL_GRID} border-b border-rule py-2.5 text-label tabular-nums`}
		>
			<span className="flex min-w-0 items-baseline gap-2">
				<Link
					to="/models/$name"
					params={{ name: target.slug }}
					className="truncate text-foreground hover:underline"
				>
					{target.label}
				</Link>
				{!target.served && (
					<span className="shrink-0 text-meta text-ink-3">
						not served by this host
					</span>
				)}
			</span>
			<span className="text-right text-ink-2">{target.requests}</span>
			<span className="text-right text-foreground">{target.spend}</span>
		</div>
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
