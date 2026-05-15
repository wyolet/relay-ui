import { AlertCircle, AlertTriangle, Info, type LucideIcon } from "lucide-react";
import type { Diagnostic, Severity } from "@/diagnostics/types";

const TONE: Record<
	Severity,
	{ Icon: LucideIcon; iconClass: string; rowClass: string; label: string }
> = {
	error: {
		Icon: AlertCircle,
		iconClass: "text-destructive",
		rowClass: "bg-destructive/5 border-destructive/30",
		label: "Error",
	},
	warn: {
		Icon: AlertTriangle,
		iconClass: "text-amber-600 dark:text-amber-400",
		rowClass: "bg-amber-500/5 border-amber-500/30",
		label: "Warning",
	},
	info: {
		Icon: Info,
		iconClass: "text-sky-600 dark:text-sky-400",
		rowClass: "bg-sky-500/5 border-sky-500/30",
		label: "Info",
	},
};

interface DiagnosticListProps {
	diagnostics: Diagnostic[];
	emptyHint?: string;
	className?: string;
}

export function DiagnosticList({
	diagnostics,
	emptyHint,
	className,
}: DiagnosticListProps) {
	if (diagnostics.length === 0) {
		if (!emptyHint) return null;
		return (
			<p className={["text-xs text-muted-foreground", className ?? ""].join(" ")}>
				{emptyHint}
			</p>
		);
	}
	return (
		<ul className={["flex flex-col gap-1.5", className ?? ""].join(" ")}>
			{diagnostics.map((d) => {
				const tone = TONE[d.severity];
				const Icon = tone.Icon;
				return (
					<li
						key={`${d.code}:${d.message}`}
						className={[
							"flex items-start gap-2 rounded-md border px-2.5 py-1.5",
							tone.rowClass,
						].join(" ")}
					>
						<Icon
							className={["w-3.5 h-3.5 mt-0.5 shrink-0", tone.iconClass].join(
								" ",
							)}
							aria-label={tone.label}
						/>
						<span className="text-xs text-foreground leading-snug">
							{d.message}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
