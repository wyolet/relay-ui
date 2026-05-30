import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-resource edit/delete gates. Host-owned policies and upstream-synced
 * catalog resources (models/providers/hosts) are locked by default so users
 * don't clobber server-managed state. Flip the flag from the
 * Settings → Edit permissions page (or DevTools) to unlock.
 */
export type AllowEditKey =
	| "host-owned-policies"
	| "models"
	| "providers"
	| "hosts";

interface PermissionsState {
	allowEdit: Record<AllowEditKey, boolean>;
	setAllowEdit: (key: AllowEditKey, value: boolean) => void;
}

const DEFAULTS: Record<AllowEditKey, boolean> = {
	"host-owned-policies": false,
	models: false,
	providers: false,
	hosts: false,
};

export const usePermissionsStore = create<PermissionsState>()(
	persist(
		(set) => ({
			allowEdit: DEFAULTS,
			setAllowEdit: (key, value) =>
				set((s) => ({ allowEdit: { ...s.allowEdit, [key]: value } })),
		}),
		{
			name: "relay-ui:permissions",
			partialize: (s) => ({ allowEdit: s.allowEdit }),
			merge: (persisted, current) => {
				const p =
					persisted && typeof persisted === "object" && "allowEdit" in persisted
						? (persisted as Partial<PermissionsState>).allowEdit
						: undefined;
				return {
					...current,
					allowEdit: { ...DEFAULTS, ...(p ?? {}) },
				};
			},
		},
	),
);

export function useAllowEdit(key: AllowEditKey): boolean {
	return usePermissionsStore((s) => s.allowEdit[key]);
}

/** All edit-permission flags + setter, for the settings page. */
export function useEditPermissions() {
	const flags = usePermissionsStore((s) => s.allowEdit);
	const setAllowEdit = usePermissionsStore((s) => s.setAllowEdit);
	return { flags, setAllowEdit };
}
