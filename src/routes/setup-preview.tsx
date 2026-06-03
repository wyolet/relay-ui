import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useCatalogGraph } from "@/api/hooks/catalog";
import { useHosts } from "@/api/hooks/hosts";
import { Button } from "@/components/ui/button";
import {
	PROVIDERS,
	type ProviderId,
	providerById,
} from "@/setup/providerCatalog";
import { SuccessStep } from "@/setup/SuccessStep";
import type { SampleModel } from "@/setup/useSetupWizard";
import { PageLoader } from "@/shared/Spinner";

/**
 * THROWAWAY dev harness (/setup-preview). Pins the wizard's final code-block
 * step and lets you flip providers to verify the `/{adapter}/v1` path resolves
 * correctly from real catalog bindings. Not linked anywhere; delete before ship.
 */
export const Route = createFileRoute("/setup-preview")({
	component: () => (
		<Suspense fallback={<PageLoader />}>
			<SetupPreview />
		</Suspense>
	),
});

const FAKE_KEY = {
	plaintext: "sk-wr-PREVIEWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
	displayName: "Preview relay key",
};

function SetupPreview() {
	const { data: hostsData } = useHosts();
	const { data: graph } = useCatalogGraph();
	const { data: featuredGraph } = useCatalogGraph({ label: ["featured=true"] });
	const [providerId, setProviderId] = useState<ProviderId>("openai");

	// Same derivation the wizard uses: host by provider matcher → server-side
	// featured models (fallback full graph) → display label + request value.
	const modelsByProvider = useMemo(() => {
		const hosts = hostsData.items ?? [];
		const all = graph.models ?? [];
		const featuredModels = featuredGraph.models ?? [];
		const onHost = (list: typeof all, hostId: string) =>
			list.filter((m) => (m.bindings ?? []).some((b) => b.hostId === hostId));
		const out = new Map<ProviderId, SampleModel[]>();
		for (const def of PROVIDERS) {
			const host = hosts.find((h) => def.match(h.metadata.name.toLowerCase()));
			const hostId = host?.metadata.id;
			if (!hostId) {
				out.set(def.id, []);
				continue;
			}
			const featured = onHost(featuredModels, hostId);
			const source = featured.length > 0 ? featured : onHost(all, hostId);
			out.set(
				def.id,
				source.slice(0, 6).map((m) => ({
					name: m.name,
					displayName: m.displayName ?? m.name,
					value: m.pointer ?? m.name,
				})),
			);
		}
		return out;
	}, [hostsData.items, graph.models, featuredGraph.models]);

	const models = modelsByProvider.get(providerId) ?? [];

	return (
		<div className="min-h-screen bg-background px-4 py-10">
			<div className="mx-auto max-w-xl">
				<div className="mb-4 rounded-xl border border-dashed border-border/70 bg-card/60 p-4">
					<p className="mb-2 text-xs font-medium text-muted-foreground">
						Dev preview — pick a provider, check the snippet's base path
					</p>
					<div className="flex flex-wrap gap-2">
						{PROVIDERS.map((def) => {
							const n = modelsByProvider.get(def.id)?.length ?? 0;
							return (
								<Button
									key={def.id}
									type="button"
									size="sm"
									variant={def.id === providerId ? "default" : "outline"}
									onClick={() => setProviderId(def.id)}
								>
									{def.label}
									<span className="ml-1.5 opacity-60">{n}</span>
								</Button>
							);
						})}
					</div>
					<p className="mt-2 text-[11px] text-muted-foreground">
						{providerById(providerId).label} → {models.length} models;
						snippet path is shape-level (OpenAI →{" "}
						<code className="text-foreground">/openai/v1</code>)
					</p>
				</div>

				<div className="rounded-3xl border border-border/70 bg-card/95 p-8 shadow-2xl">
					<SuccessStep
						key={providerId}
						relayKey={FAKE_KEY}
						models={models}
						onAddAnother={() => {}}
						onFinish={() => {}}
					/>
				</div>
			</div>
		</div>
	);
}
