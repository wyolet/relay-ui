import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkContextRef } from "@/lib/workContext";

interface WorkContextState {
	/** The context the caller picked; null until they pick one. */
	selected: WorkContextRef | null;
	select: (ref: WorkContextRef) => void;
}

/** The context new rows land in, kept across reloads. */
export const useWorkContextStore = create<WorkContextState>()(
	persist(
		(set) => ({
			selected: null,
			select: (ref) => set({ selected: { kind: ref.kind, id: ref.id } }),
		}),
		{
			name: "work-context",
			partialize: (s) => ({ selected: s.selected }),
		},
	),
);
