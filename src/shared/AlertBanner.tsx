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
		iconClass: "text-warning",
		wrapClass: "border-warning/30 bg-warning/5",
	},
	info: {
		Icon: Info,
		iconClass: "text-info",
		wrapClass: "border-info/30 bg-info/5",
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
 * hand-roll a warning/destructive/info-tinted card. Optional `body` slot lets
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
							? "border-warning/30"
							: severity === "error"
								? "border-destructive/30"
								: "border-info/30"
					}`}
				>
					{body}
				</div>
			)}
		</div>
	);
}
