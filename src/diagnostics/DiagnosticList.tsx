import { Link } from "@tanstack/react-router";
import {
	AlertCircle,
	AlertTriangle,
	Info,
	type LucideIcon,
} from "lucide-react";
import type { DiagLink, Diagnostic, Severity } from "@/diagnostics/types";

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
		iconClass: "text-warning",
		rowClass: "bg-warning/5 border-warning/30",
		label: "Warning",
	},
	info: {
		Icon: Info,
		iconClass: "text-info",
		rowClass: "bg-info/5 border-info/30",
		label: "Info",
	},
};

/**
 * Typed dispatcher over the closed set of routes diagnostic links can point
 * at. Adding a new target = adding a case here; keeps TanStack Router's
 * typed `to` prop honest without `as any`.
 */
function DiagnosticActionLink({ link }: { link: DiagLink }) {
	if (link.to === "/policies/rate-limits/$name" && link.params?.name) {
		return (
			<Link
				to="/policies/rate-limits/$name"
				params={{ name: link.params.name }}
				className="ml-1 underline underline-offset-2 hover:text-primary"
			>
				View
			</Link>
		);
	}
	if (link.to === "/policies/$name" && link.params?.name) {
		return (
			<Link
				to="/policies/$name"
				params={{ name: link.params.name }}
				className="ml-1 underline underline-offset-2 hover:text-primary"
			>
				View
			</Link>
		);
	}
	if (link.to === "/host-keys/$name" && link.params?.name) {
		return (
			<Link
				to="/host-keys/$name"
				params={{ name: link.params.name }}
				className="ml-1 underline underline-offset-2 hover:text-primary"
			>
				View
			</Link>
		);
	}
	if (link.to === "/relay-keys/$name" && link.params?.name) {
		return (
			<Link
				to="/relay-keys/$name"
				params={{ name: link.params.name }}
				className="ml-1 underline underline-offset-2 hover:text-primary"
			>
				View
			</Link>
		);
	}
	if (link.to === "/models/$name" && link.params?.name) {
		return (
			<Link
				to="/models/$name"
				params={{ name: link.params.name }}
				className="ml-1 underline underline-offset-2 hover:text-primary"
			>
				View
			</Link>
		);
	}
	return null;
}

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
			<p
				className={["text-xs text-muted-foreground", className ?? ""].join(" ")}
			>
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
							{d.link && <DiagnosticActionLink link={d.link} />}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
