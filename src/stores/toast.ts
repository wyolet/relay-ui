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
	/** What the toast is about; a newer toast with the same key replaces it. */
	key?: string;
	/** How many times this exact line repeated in a row. */
	count: number;
	/** Bumps on each merge, so the toast restarts its time-left line. */
	version: number;
}

/** How long a toast without an action stays, paused while hovered. */
export const TOAST_MS = 5_000;

interface ToastState {
	toasts: ToastMessage[];
	push: (
		kind: ToastKind,
		message: string,
		action?: ToastAction,
		key?: string,
	) => string;
	dismiss: (id: string) => void;
}

let _idSeq = 0;
function nextId(): string {
	_idSeq += 1;
	return String(_idSeq);
}

export const useToastStore = create<ToastState>((set, get) => ({
	toasts: [],
	push: (kind, message, action, key) => {
		// A toast about the same subject (same key, or the same line repeated)
		// updates the one on screen instead of stacking: toggling a switch back
		// and forth keeps one toast with a count.
		const same = action
			? undefined
			: get().toasts.find(
					(t) =>
						!t.action &&
						(key ? t.key === key : t.kind === kind && t.message === message),
				);
		if (same) {
			set((s) => ({
				toasts: s.toasts.map((t) =>
					t.id === same.id
						? {
								...t,
								kind,
								message,
								count: t.message === message ? t.count + 1 : 1,
								version: t.version + 1,
							}
						: t,
				),
			}));
			return same.id;
		}
		const id = nextId();
		set((s) => ({
			toasts: [
				...s.toasts,
				{ id, kind, message, action, key, count: 1, version: 0 },
			],
		}));
		return id;
	},
	dismiss: (id) =>
		set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper kept for convenience: `toast("success", "saved")`. A
 * toast offering an action stays until used or dismissed; others leave after
 * {@link TOAST_MS}. */
export function toast(
	kind: ToastKind,
	message: string,
	action?: ToastAction,
	key?: string,
): string {
	return useToastStore.getState().push(kind, message, action, key);
}
