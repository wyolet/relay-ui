import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Diagnostic, Severity } from "@/diagnostics/types";
import { worstSeverity } from "@/diagnostics/types";

const TONE: Record<Severity, { dot: string; Icon: typeof Info; label: string }> =
	{
		error: { dot: "bg-destructive", Icon: AlertCircle, label: "Error" },
		warn: {
			dot: "bg-amber-500 dark:bg-amber-400",
			Icon: AlertTriangle,
			label: "Warning",
		},
		info: { dot: "bg-sky-500 dark:bg-sky-400", Icon: Info, label: "Info" },
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
	const title = diagnostics.map((d) => `[${d.severity}] ${d.message}`).join("\n");
	return (
		<span
			className={[
				"inline-flex items-center gap-1 text-[11px] text-muted-foreground",
				className ?? "",
			].join(" ")}
			title={title}
			aria-label={`${count} ${tone.label.toLowerCase()}${count === 1 ? "" : "s"}`}
		>
			<span
				className={[
					"inline-block size-2 rounded-full",
					tone.dot,
				].join(" ")}
				aria-hidden="true"
			/>
			{count > 1 && <span className="tabular-nums">{count}</span>}
		</span>
	);
}
