/**
 * Passthrough settings store. Frontend-only persistence until backend exposes
 * a /control/settings endpoint — values round-trip via localStorage.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PassthroughTransport = "http" | "ws" | "amqp" | "pubsub";

export interface PassthroughSettings {
	allowProxy: boolean;
	allowUnauthenticated: boolean;
	allowedModels: string[];
	allowedTransports: PassthroughTransport[];
}

interface PassthroughState extends PassthroughSettings {
	patch: (next: Partial<PassthroughSettings>) => void;
	reset: () => void;
}

const initial: PassthroughSettings = {
	allowProxy: false,
	allowUnauthenticated: false,
	allowedModels: [],
	allowedTransports: ["http"],
};

export const usePassthroughStore = create<PassthroughState>()(
	persist(
		(set) => ({
			...initial,
			patch: (next) => set(next),
			reset: () => set(initial),
		}),
		{
			name: "passthrough-settings",
			partialize: (s) => ({
				allowProxy: s.allowProxy,
				allowUnauthenticated: s.allowUnauthenticated,
				allowedModels: s.allowedModels,
				allowedTransports: s.allowedTransports,
			}),
		},
	),
);
