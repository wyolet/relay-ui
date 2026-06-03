import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SetupState {
	/** True once the operator has finished or explicitly dismissed the wizard. */
	dismissed: boolean;
	setDismissed: (dismissed: boolean) => void;
}

/**
 * Persisted flag that gates the first-run auto-redirect into `/setup`. We only
 * yank the operator into the wizard while this is false; bailing out (or
 * completing) sets it so the dashboard stays put on subsequent visits. The
 * opt-in WelcomePanel remains as the manual entry point regardless.
 */
export const useSetupStore = create<SetupState>()(
	persist(
		(set) => ({
			dismissed: false,
			setDismissed: (dismissed) => set({ dismissed }),
		}),
		{
			name: "relay-setup",
			partialize: (s) => ({ dismissed: s.dismissed }),
		},
	),
);
