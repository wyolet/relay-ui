import { useAuth } from "@/api/auth";
import { type GovernanceSection, useGovernance } from "@/api/hooks/governance";
import type { components } from "@/api/types.gen";
import { resolveMutability } from "@/lib/ownership";

/** Whether the caller may edit or delete the row, as relay's governance decides it. */
export function useMutability(
	metadata: Pick<
		components["schemas"]["Metadata"],
		"owner" | "catalogDetachedAt"
	>,
	section: GovernanceSection,
): { canEdit: boolean; canDelete: boolean } {
	const gov = useGovernance(section);
	const { isAdmin } = useAuth();
	return resolveMutability(metadata, gov, isAdmin);
}
