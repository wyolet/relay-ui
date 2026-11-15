import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Model } from "@/api/types/model";
import { displayLabel } from "@/lib/displayLabel";
import { ModelCapabilityList } from "@/models/ModelCapabilities";
import { ModelSnapshotsList } from "@/models/ModelSnapshotsList";
import {
	activeCapabilities,
	listedSnapshots,
	specFields,
} from "@/models/modelDetail";
import type { ModelProvider } from "@/models/useModelProvider";
import { Section } from "@/shared/Section";

/** What the catalog says the model is: its provider, limits, dates,
 * capabilities, and its snapshots when there is more than one. Facts it left
 * blank don't show. */
export function ModelSpec({
	model,
	provider,
}: {
	model: Model;
	provider: ModelProvider;
}) {
	const fields = specFields(model);
	const caps = activeCapabilities(model.spec.capabilities);
	const snapshots = listedSnapshots(model);
	const hasFields = fields.length > 0 || provider.providerSlug !== "";
	return (
		<Section title="Spec">
			{!hasFields && caps.length === 0 && snapshots.length === 0 ? (
				<p className="text-label text-ink-2">
					The catalog lists no limits or capabilities for this model.
				</p>
			) : (
				<div className="grid grid-cols-1 gap-7">
					{hasFields && (
						<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-label">
							{provider.providerSlug && (
								<>
									<dt className="text-ink-3">Provider</dt>
									<dd className="truncate">
										<Link
											to="/providers/$name"
											params={{ name: provider.providerSlug }}
											className="text-foreground hover:underline"
										>
											{provider.provider
												? displayLabel(provider.provider.metadata)
												: provider.providerSlug}
										</Link>
									</dd>
								</>
							)}
							{fields.map((f) => (
								<div key={f.label} className="contents">
									<dt className="text-ink-3">{f.label}</dt>
									<dd
										className="truncate text-foreground tabular-nums"
										title={f.value}
									>
										{f.value}
									</dd>
								</div>
							))}
						</dl>
					)}
					{caps.length > 0 && (
						<SpecGroup title="Capabilities">
							<ModelCapabilityList caps={caps} />
						</SpecGroup>
					)}
					{snapshots.length > 0 && (
						<SpecGroup title="Snapshots">
							<ModelSnapshotsList snapshots={snapshots} />
						</SpecGroup>
					)}
				</div>
			)}
		</Section>
	);
}

function SpecGroup({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="grid grid-cols-1 gap-3">
			<h3 className="text-label font-medium text-foreground">{title}</h3>
			{children}
		</div>
	);
}
