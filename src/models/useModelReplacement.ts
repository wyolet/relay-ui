import { useModels } from "@/api/hooks/models";
import type { Model } from "@/api/types/model";

/** The model a deprecation names as its successor, when the catalog has it. */
export function useModelReplacement(model: Model): Model | undefined {
	const { data: models } = useModels();
	const ref = model.spec.deprecation?.replacement;
	if (!ref) return undefined;
	return (models.items ?? []).find(
		(m) => m.metadata.id === ref || m.metadata.name === ref,
	);
}
