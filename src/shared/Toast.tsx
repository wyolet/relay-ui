import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import {
	TOAST_MS,
	type ToastKind,
	type ToastMessage,
	useToastStore,
} from "@/stores/toast";

export type { ToastAction, ToastKind, ToastMessage } from "@/stores/toast";
// Re-export the imperative helper so existing call sites stay working.
export { toast } from "@/stores/toast";

const BADGE: Record<ToastKind, string> = {
	success: "bg-input-wash text-field-accent",
	error: "bg-destructive/15 text-destructive",
};

const LINE: Record<ToastKind, string> = {
	success: "bg-field-accent",
	error: "bg-destructive",
};

export function ToastContainer() {
	const toasts = useToastStore((s) => s.toasts);
	if (toasts.length === 0) return null;
	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
		>
			{toasts.map((t) => (
				<ToastCard key={t.id} toast={t} />
			))}
		</div>
	);
}

/** One toast. Its time-left line's animation is the timer: hovering pauses
 * both, and the line ending dismisses the toast, so they can't drift apart. */
function ToastCard({ toast: t }: { toast: ToastMessage }) {
	const dismiss = useToastStore((s) => s.dismiss);
	const [leaving, setLeaving] = useState(false);
	const timed = !t.action;
	// The exit animation's end removes the toast; without motion there is no
	// animation to end, so it goes at once.
	const leave = () =>
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
			? dismiss(t.id)
			: setLeaving(true);

	return (
		<div
			role={t.kind === "error" ? "alert" : "status"}
			className={cn(
				"group pointer-events-auto relative overflow-hidden rounded-xl border border-rule bg-popover text-popover-foreground shadow-tip",
				"animate-toast-in motion-reduce:animate-none",
				leaving && "animate-toast-out motion-reduce:animate-none",
			)}
			onAnimationEnd={(e) => {
				if (leaving && e.target === e.currentTarget) dismiss(t.id);
			}}
		>
			<div
				key={`body-${t.version}`}
				className={cn(
					"flex items-center gap-3 py-3 pr-2 pl-3",
					t.version > 0 && "animate-toast-bump motion-reduce:animate-none",
				)}
			>
				<KindBadge kind={t.kind} />
				<p className="min-w-0 flex-1 text-label text-foreground">{t.message}</p>
				{t.count > 1 && (
					<span className="shrink-0 rounded-full bg-muted px-1.5 text-foot text-ink-2 tabular-nums">
						×{t.count}
					</span>
				)}
				{t.action && (
					<Button
						type="button"
						size="sm"
						onClick={() => {
							leave();
							t.action?.onClick();
						}}
					>
						{t.action.label}
					</Button>
				)}
				<IconButton
					icon={X}
					weight="bare"
					size="xs"
					label="Dismiss"
					onClick={leave}
					className="shrink-0 text-ink-3 hover:text-foreground"
				/>
			</div>
			{timed && (
				<span
					key={`line-${t.version}`}
					aria-hidden
					className={cn(
						"absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-60",
						"animate-toast-countdown group-hover:[animation-play-state:paused]",
						LINE[t.kind],
					)}
					style={{ animationDuration: `${TOAST_MS}ms` }}
					onAnimationEnd={(e) => {
						e.stopPropagation();
						leave();
					}}
				/>
			)}
		</div>
	);
}

/** A round badge with the kind's mark; the success check draws itself in. */
function KindBadge({ kind }: { kind: ToastKind }) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-7 shrink-0 items-center justify-center rounded-full",
				BADGE[kind],
			)}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				className="size-4"
				fill="none"
				stroke="currentColor"
				strokeWidth={2.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				{kind === "success" ? (
					<path
						d="M5 12.5l4.5 4.5L19 7.5"
						strokeDasharray={24}
						className="animate-toast-check motion-reduce:animate-none"
					/>
				) : (
					<>
						<path d="M12 7v6" />
						<path d="M12 17h.01" />
					</>
				)}
			</svg>
		</span>
	);
}
