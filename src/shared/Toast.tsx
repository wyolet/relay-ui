import { X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { type ToastKind, useToastStore } from "@/stores/toast";

export type { ToastKind, ToastMessage } from "@/stores/toast";
// Re-export the imperative helper so existing call sites stay working.
export { toast } from "@/stores/toast";

const KIND_CLASSES: Record<ToastKind, string> = {
	success: "bg-brand-600 text-white",
	error: "bg-destructive text-destructive-foreground",
};

export function ToastContainer() {
	const toasts = useToastStore((s) => s.toasts);
	const dismiss = useToastStore((s) => s.dismiss);

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
					<IconButton
						icon={X}
						weight="bare"
						size="xs"
						label="Dismiss"
						onClick={() => dismiss(t.id)}
						className="text-current opacity-75 hover:text-current hover:opacity-100"
					/>
				</div>
			))}
		</div>
	);
}
