import { create } from "zustand";

export type ToastKind = "success" | "error";

export interface ToastAction {
	label: string;
	onClick: () => void;
}

export interface ToastMessage {
	id: string;
	kind: ToastKind;
	message: string;
	action?: ToastAction;
}

interface ToastState {
	toasts: ToastMessage[];
	push: (kind: ToastKind, message: string, action?: ToastAction) => string;
	dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 4_000;

let _idSeq = 0;
function nextId(): string {
	_idSeq += 1;
	return String(_idSeq);
}

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],
	push: (kind, message, action) => {
		const id = nextId();
		set((s) => ({ toasts: [...s.toasts, { id, kind, message, action }] }));
		// A toast offering an action stays until used or dismissed, so the
		// action can't vanish while the user reads the message.
		if (!action) {
			setTimeout(() => {
				useToastStore.getState().dismiss(id);
			}, AUTO_DISMISS_MS);
		}
		return id;
	},
	dismiss: (id) =>
		set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper kept for convenience: `toast("success", "saved")`. */
export function toast(
	kind: ToastKind,
	message: string,
	action?: ToastAction,
): string {
	return useToastStore.getState().push(kind, message, action);
}
