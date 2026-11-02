import { Boxes } from "lucide-react";
import type { Host } from "@/api/types/host";
import { useHostReferences } from "@/hosts/useHostReferences";
import { ModelsByFamily } from "@/models/ModelsByFamily";
import { EmptyState } from "@/shared/EmptyState";

export function HostModelsTab({ host }: { host: Host }) {
	const { models } = useHostReferences(host);
	return (
		<ModelsByFamily
			models={models}
			empty={
				<EmptyState
					icon={Boxes}
					title="No models on this host"
					body="Models are typically synced from upstream. None resolve to this host yet."
				/>
			}
		/>
	);
}
