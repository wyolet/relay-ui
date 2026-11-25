import {
	FEATURE_CUSTOM_ROLES,
	useHasLicenseFeature,
} from "@/api/hooks/license";
import type { Role } from "@/api/types/role";
import { isBuiltinRole } from "@/roles/vocabulary";

/** Whether a role is seeded (read-only) and whether this deployment may edit it. */
export function useRoleAuthoring(role: Role) {
	const canAuthor = useHasLicenseFeature(FEATURE_CUSTOM_ROLES);
	const builtin = isBuiltinRole(role.metadata.owner?.kind);
	return { builtin, canAuthor, editable: !builtin && canAuthor };
}
