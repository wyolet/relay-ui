import { Link } from "@tanstack/react-router";
import { Banknote } from "lucide-react";
import type { Pricing } from "@/api/types/pricing";
import { MeterGrid } from "@/pricing/MeterGrid";
import { BackLink } from "@/shared/BackLink";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { Facts } from "@/shared/Facts";
import { FigureRow } from "@/shared/FigureRow";
import { Section } from "@/shared/Section";
import { CatalogDetachedBadge, StatusBadge } from "@/shared/StatusBadge";
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
		<div>
			<DetailPageHeader
				back={<BackLink to="/pricing">Pricing</BackLink>}
				icon={Banknote}
				metadata={pricing.metadata}
				badges={
					<>
						<StatusBadge enabled={enabled} />
						<CatalogDetachedBadge
							detachedAt={pricing.metadata.catalogDetachedAt}
						/>
					</>
				}
				extra={
					<div className="mt-1.5">
						<Facts
							items={[
								{
									label: "Billed by",
									value: host ? (
										<Link
											to="/hosts/$name"
											params={{ name: host.slug }}
											className="hover:underline"
										>
											{host.label}
										</Link>
									) : (
										"No host"
									),
								},
							]}
						/>
					</div>
				}
			>
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
			</DetailPageHeader>

			<div className="grid gap-14">
				<FigureRow figures={figures} />

				<Section title="Rates" meta={currency}>
					{rates.length === 0 ? (
						<p className="text-label text-ink-2">
							No rates defined: usage on the bindings this sheet covers counts
							as unpriced.
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
		<Facts
			items={[
				...(createdAt
					? [{ label: "Created", value: new Date(createdAt).toLocaleString() }]
					: []),
				...(updatedAt
					? [{ label: "Updated", value: new Date(updatedAt).toLocaleString() }]
					: []),
			]}
		/>
	);
}
