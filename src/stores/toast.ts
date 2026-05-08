import { create } from "zustand";

export type ToastKind = "success" | "error";

export interface ToastMessage {
	id: string;
	kind: ToastKind;
	message: string;
}

interface ToastState {
	toasts: ToastMessage[];
	push: (kind: ToastKind, message: string) => string;
	dismiss: (id: string) => void;
}

let _idSeq = 0;
function nextId(): string {
	_idSeq += 1;
	return String(_idSeq);
}

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],
	push: (kind, message) => {
		const id = nextId();
		set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
		setTimeout(() => {
			useToastStore.getState().dismiss(id);
		}, 4_000);
		return id;
	},
	dismiss: (id) =>
		set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper kept for convenience: `toast("success", "saved")`. */
export function toast(kind: ToastKind, message: string): string {
	return useToastStore.getState().push(kind, message);
}
