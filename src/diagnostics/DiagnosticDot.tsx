import {
	AlertCircle,
	AlertTriangle,
	Info,
	type LucideIcon,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Diagnostic, Severity } from "@/diagnostics/types";
import { worstSeverity } from "@/diagnostics/types";

const TONE: Record<
	Severity,
	{ dot: string; Icon: LucideIcon; iconClass: string; label: string }
> = {
	error: {
		dot: "bg-destructive",
		Icon: AlertCircle,
		iconClass: "text-destructive",
		label: "Error",
	},
	warn: {
		dot: "bg-warning",
		Icon: AlertTriangle,
		iconClass: "text-warning",
		label: "Warning",
	},
	info: {
		dot: "bg-info",
		Icon: Info,
		iconClass: "text-info",
		label: "Info",
	},
};

interface DiagnosticDotProps {
	diagnostics: Diagnostic[];
	className?: string;
}

export function DiagnosticDot({ diagnostics, className }: DiagnosticDotProps) {
	const worst = worstSeverity(diagnostics);
	if (!worst) return null;
	const tone = TONE[worst];
	const count = diagnostics.length;
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span
						role="img"
						className={[
							"inline-flex items-center gap-1 text-[11px] text-muted-foreground cursor-default",
							className ?? "",
						].join(" ")}
						aria-label={`${count} ${tone.label.toLowerCase()}${count === 1 ? "" : "s"}`}
					>
						<span
							className={["inline-block size-2 rounded-full", tone.dot].join(
								" ",
							)}
							aria-hidden="true"
						/>
						{count > 1 && <span className="tabular-nums">{count}</span>}
					</span>
				}
			/>
			<TooltipContent className="max-w-sm">
				<ul className="flex flex-col gap-1.5 text-left">
					{diagnostics.map((d) => {
						const t = TONE[d.severity];
						const Icon = t.Icon;
						return (
							<li
								key={`${d.code}:${d.message}`}
								className="flex items-start gap-1.5"
							>
								<Icon
									className={["w-3 h-3 mt-0.5 shrink-0", t.iconClass].join(" ")}
									aria-hidden="true"
								/>
								<span className="leading-snug">{d.message}</span>
							</li>
						);
					})}
				</ul>
			</TooltipContent>
		</Tooltip>
	);
}
