import {
	AlertCircle,
	AlertTriangle,
	Info,
	type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type AlertSeverity = "error" | "warn" | "info";

interface Tone {
	Icon: LucideIcon;
	iconClass: string;
	wrapClass: string;
}

const TONE: Record<AlertSeverity, Tone> = {
	error: {
		Icon: AlertCircle,
		iconClass: "text-destructive",
		wrapClass: "border-destructive/30 bg-destructive/5",
	},
	warn: {
		Icon: AlertTriangle,
		iconClass: "text-amber-600 dark:text-amber-400",
		wrapClass: "border-amber-500/30 bg-amber-500/5",
	},
	info: {
		Icon: Info,
		iconClass: "text-sky-600 dark:text-sky-400",
		wrapClass: "border-sky-500/30 bg-sky-500/5",
	},
};

interface AlertBannerProps {
	severity: AlertSeverity;
	title?: ReactNode;
	children?: ReactNode;
	/** Slot rendered below the header, full-width inside the same bordered card (e.g. a table). */
	body?: ReactNode;
	className?: string;
}

/**
 * The one warning/error/info banner. Use this anywhere we'd otherwise
 * hand-roll an amber/destructive/sky-tinted card. Optional `body` slot lets
 * callers attach a table or list beneath the header inside the same frame.
 */
export function AlertBanner({
	severity,
	title,
	children,
	body,
	className,
}: AlertBannerProps) {
	const { Icon, iconClass, wrapClass } = TONE[severity];
	return (
		<div
			className={`rounded-md border ${wrapClass}${className ? ` ${className}` : ""}`}
		>
			<div className="flex items-start gap-2 px-3 py-2">
				<Icon
					className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${iconClass}`}
					aria-hidden
				/>
				<div className="flex-1 min-w-0 text-[11px] text-foreground">
					{title && (
						<div className="text-[12px] font-medium text-foreground">
							{title}
						</div>
					)}
					{children && (
						<div className={title ? "text-muted-foreground" : undefined}>
							{children}
						</div>
					)}
				</div>
			</div>
			{body && (
				<div
					className={`border-t ${
						severity === "warn"
							? "border-amber-500/30"
							: severity === "error"
								? "border-destructive/30"
								: "border-sky-500/30"
					}`}
				>
					{body}
				</div>
			)}
		</div>
	);
}
