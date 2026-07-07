import { Link } from "@tanstack/react-router";
import { Banknote, Boxes, Pencil, Power, Server, Trash2 } from "lucide-react";
import type { Pricing } from "@/api/types/pricing";
import { Button, buttonVariants } from "@/components/ui/button";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { MeterGrid } from "@/pricing/MeterGrid";
import { useHostOptionById } from "@/pricing/useHostOptions";
import { useTargetModelLabeler } from "@/pricing/useTargetModelOptions";
import { StatusBadge } from "@/shared/StatusBadge";

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
		<div className="flex flex-col gap-6">
			<Header
				pricing={pricing}
				onDelete={onDelete}
				onToggleEnabled={onToggleEnabled}
				deleting={deleting}
				toggling={toggling}
			/>
			<RatesPanel pricing={pricing} />
			<TargetModelsPanel targetModels={pricing.spec.targetModels} />
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
			<div className="flex items-center gap-2 shrink-0">
				<Button
					type="button"
					variant="outline"
					size="lg"
					onClick={onToggleEnabled}
					disabled={toggling}
				>
					<Power className="size-3.5" />
					{enabled ? "Disable" : "Enable"}
				</Button>
				<Link
					to="/pricing/$name/edit"
					params={{ name }}
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					<Pencil className="size-3.5" />
					Edit
				</Link>
				<Button
					type="button"
					variant="destructive"
					size="lg"
					onClick={onDelete}
					disabled={deleting}
				>
					<Trash2 className="size-3.5" />
					Delete
				</Button>
			</div>
		</div>
	);
}

function RatesPanel({ pricing }: { pricing: Pricing }) {
	const rates = pricing.spec.rates ?? [];
	return (
		<section>
			<SectionTitle>Rates</SectionTitle>
			{rates.length === 0 ? (
				<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
					<div className="text-sm font-medium text-foreground">
						No rates defined
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						Usage on bindings with this pricing will count as unpriced.
					</div>
				</div>
			) : (
				<div className="max-w-2xl">
					<MeterGrid rates={rates} currency={pricing.spec.currency || "USD"} />
				</div>
			)}
		</section>
	);
}

function TargetModelsPanel({
	targetModels,
}: {
	targetModels: string[] | null;
}) {
	const labelOf = useTargetModelLabeler();
	return (
		<section>
			<SectionTitle>Target models</SectionTitle>
			{!targetModels || targetModels.length === 0 ? (
				<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
					<Boxes
						className="mx-auto w-5 h-5 text-muted-foreground/60 mb-1.5"
						aria-hidden
					/>
					<div className="text-sm font-medium text-foreground">Unscoped</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						Not pinned to specific models — bindings reference it directly.
					</div>
				</div>
			) : (
				<div className="flex flex-wrap gap-1.5">
					{targetModels.map((id) => (
						<span
							key={id}
							className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-foreground"
						>
							{labelOf(id)}
						</span>
					))}
				</div>
			)}
		</section>
	);
}

function MetadataFooter({ pricing }: { pricing: Pricing }) {
	const { createdAt, updatedAt } = pricing.metadata;
	if (!createdAt && !updatedAt) return null;
	return (
		<p className="text-[11px] text-muted-foreground">
			{createdAt && <>Created {new Date(createdAt).toLocaleString()}</>}
			{createdAt && updatedAt && " · "}
			{updatedAt && <>Updated {new Date(updatedAt).toLocaleString()}</>}
		</p>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
			{children}
		</h2>
	);
}
