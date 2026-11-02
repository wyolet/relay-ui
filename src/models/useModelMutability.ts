import { useGovernance } from "@/api/hooks/governance";
import type { Model } from "@/api/types/model";
import { resolveMutability } from "@/lib/ownership";

/** Whether the operator may edit or delete this model under its owner. */
export function useModelMutability(model: Model) {
	const gov = useGovernance("model");
	return resolveMutability(model.metadata, gov);
}
