import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Facts } from "@/shared/Facts";
import { RankList } from "@/shared/RankList";
import { Section } from "@/shared/Section";
import { useHealthBlock } from "./useHealthBlock";

const LINE = "group flex items-baseline gap-2 text-label text-foreground";

/** Latency, errors and the slowest model for the period, beside the spend chart. */
export function HealthBlock() {
	const h = useHealthBlock();
	return (
		<Section title="Health" meta={h.period}>
			<div className="grid gap-7">
				<Part title="Latency">
					<RankList rows={h.latency} empty="No timed requests." />
					{h.latencyNote && (
						<p className="text-meta text-ink-2 tabular-nums">{h.latencyNote}</p>
					)}
				</Part>
				<Part title="Errors">
					<Link
						to="/logs"
						search={{ errors: true, since: h.since }}
						className={LINE}
					>
						<span className="font-display text-mini-figure">{h.errorRate}</span>
						<span className="text-ink-2">of {h.requests} requests</span>
						<Arrow />
					</Link>
					<Facts items={h.errorKinds} />
				</Part>
				{h.slowest && (
					<Part title="Slowest model">
						<Link
							to="/logs"
							search={{ model_id: [h.slowest.modelId], since: h.since }}
							className={LINE}
						>
							<span className="min-w-0 truncate font-medium">
								{h.slowest.label}
							</span>
							<span className="shrink-0 text-ink-2 tabular-nums">
								p95 {h.slowest.p95}
							</span>
							<Arrow />
						</Link>
					</Part>
				)}
			</div>
		</Section>
	);
}

function Part({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="grid min-w-0 gap-2">
			<h3 className="text-meta text-ink-3">{title}</h3>
			{children}
		</div>
	);
}

function Arrow() {
	return (
		<ArrowRight
			className="ml-auto size-3.5 shrink-0 self-center text-ink-3 group-hover:text-foreground"
			aria-hidden
		/>
	);
}
