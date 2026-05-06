import { useEffect, useState } from "react";

export type ToastKind = "success" | "error";

export interface ToastMessage {
	id: string;
	kind: ToastKind;
	message: string;
}

// Singleton subscriber list — no context needed for a simple toast queue.
type ToastListener = (toasts: ToastMessage[]) => void;
const listeners: Set<ToastListener> = new Set();
let toastQueue: ToastMessage[] = [];

function notify() {
	for (const l of listeners) {
		l([...toastQueue]);
	}
}

let _nextId = 0;
function nextId() {
	_nextId += 1;
	return String(_nextId);
}

export function toast(kind: ToastKind, message: string) {
	const id = nextId();
	toastQueue = [...toastQueue, { id, kind, message }];
	notify();
	// Auto-dismiss after 4 s
	setTimeout(() => dismissToast(id), 4_000);
}

function dismissToast(id: string) {
	toastQueue = toastQueue.filter((t) => t.id !== id);
	notify();
}

export function useToasts(): ToastMessage[] {
	const [toasts, setToasts] = useState<ToastMessage[]>([...toastQueue]);

	useEffect(() => {
		listeners.add(setToasts);
		return () => {
			listeners.delete(setToasts);
		};
	}, []);

	return toasts;
}

const KIND_CLASSES: Record<ToastKind, string> = {
	success: "bg-green-600 text-white",
	error: "bg-red-600 text-white",
};

export function ToastContainer() {
	const toasts = useToasts();

	if (toasts.length === 0) return null;

	return (
		<div
			aria-live="polite"
			className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
		>
			{toasts.map((t) => (
				<div
					key={t.id}
					className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 ${KIND_CLASSES[t.kind]}`}
				>
					<span className="flex-1">{t.message}</span>
					<button
						type="button"
						aria-label="Dismiss"
						onClick={() => dismissToast(t.id)}
						className="shrink-0 opacity-75 hover:opacity-100"
					>
						✕
					</button>
				</div>
			))}
		</div>
	);
}
