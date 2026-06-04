import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SetupState {
	/** True once the operator has finished or explicitly dismissed the wizard. */
	dismissed: boolean;
	setDismissed: (dismissed: boolean) => void;
}

/**
 * Session-scoped flag that gates the first-run auto-redirect into `/setup`. We
 * only yank the operator into the wizard while this is false; bailing out (or
 * completing) sets it so the dashboard stays put for the rest of the session.
 *
 * It lives in `sessionStorage`, NOT `localStorage`, on purpose: a fresh launch
 * (new tab/session) re-evaluates against the real source of truth — zero relay
 * keys — and redirects again. A permanent flag would suppress the redirect for
 * a brand-new relay just because this browser once dismissed an older one. The
 * opt-in WelcomePanel remains the manual entry point regardless.
 */
export const useSetupStore = create<SetupState>()(
	persist(
		(set) => ({
			dismissed: false,
			setDismissed: (dismissed) => set({ dismissed }),
		}),
		{
			name: "relay-setup",
			storage: createJSONStorage(() => sessionStorage),
			partialize: (s) => ({ dismissed: s.dismissed }),
		},
	),
);
