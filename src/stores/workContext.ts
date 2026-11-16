import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkContextRef } from "@/lib/workContext";

interface WorkContextState {
	/** The context the caller picked; null until they pick one. */
	selected: WorkContextRef | null;
	/** Picks made this session; the page re-keys on it so a switch is seen. */
	switches: number;
	select: (ref: WorkContextRef) => void;
}

/** The context new rows land in, kept across reloads. */
export const useWorkContextStore = create<WorkContextState>()(
	persist(
		(set) => ({
			selected: null,
			switches: 0,
			select: (ref) =>
				set((s) => ({
					selected: { kind: ref.kind, id: ref.id },
					switches: s.switches + 1,
				})),
		}),
		{
			name: "work-context",
			partialize: (s) => ({ selected: s.selected }),
		},
	),
);
