import type { Policy } from "@/api/types/policy";
import { usePolicyInstanceGraph } from "@/graph/usePolicyInstanceGraph";
import type {
	PolicyGraphEdge,
	PolicyGraphNode,
} from "@/graph/usePolicyInstanceGraph";

interface Props {
	policy: Policy;
}

const NODE_W = 156;
const NODE_H = 36;
const COL_X: Record<PolicyGraphNode["kind"], number> = {
	relayKey: 40,
	policy: 280,
	rateLimit: 540,
	hostKey: 540,
	host: 800,
};

const KIND_TONE: Record<PolicyGraphNode["kind"], string> = {
	relayKey: "fill-amber-50 dark:fill-amber-950 stroke-amber-500/60",
	policy: "fill-emerald-50 dark:fill-emerald-950 stroke-emerald-500/60",
	rateLimit: "fill-emerald-50 dark:fill-emerald-950 stroke-emerald-500/60",
	hostKey: "fill-violet-50 dark:fill-violet-950 stroke-violet-500/60",
	host: "fill-sky-50 dark:fill-sky-950 stroke-sky-500/60",
};

export function PolicyInstanceGraphSVG({ policy }: Props) {
	const { nodes, edges } = usePolicyInstanceGraph(policy);

	// Lay out by column (kind), distribute vertically. Pure deterministic.
	const byKind: Record<PolicyGraphNode["kind"], PolicyGraphNode[]> = {
		relayKey: [],
		policy: [],
		rateLimit: [],
		hostKey: [],
		host: [],
	};
	for (const n of nodes) byKind[n.kind].push(n);

	const positions = new Map<string, { x: number; y: number }>();
	const colHeights: Record<string, number> = {};
	const VERTICAL_GAP = 16;

	(Object.keys(byKind) as PolicyGraphNode["kind"][]).forEach((kind) => {
		const list = byKind[kind];
		const totalH = list.length * NODE_H + (list.length - 1) * VERTICAL_GAP;
		colHeights[kind] = totalH;
	});
	const maxColH = Math.max(...Object.values(colHeights), NODE_H);

	(Object.keys(byKind) as PolicyGraphNode["kind"][]).forEach((kind) => {
		const list = byKind[kind];
		const totalH = list.length * NODE_H + (list.length - 1) * VERTICAL_GAP;
		const offsetY = (maxColH - totalH) / 2 + 20;
		list.forEach((n, i) => {
			positions.set(n.id, {
				x: COL_X[kind],
				y: offsetY + i * (NODE_H + VERTICAL_GAP),
			});
		});
	});

	const viewboxH = maxColH + 60;

	return (
		<svg
			viewBox={`0 0 980 ${viewboxH}`}
			className="w-full h-auto"
			role="img"
			aria-label={`Resource graph for policy ${policy.metadata.name}`}
		>
			<defs>
				<marker
					id="parrow-ok"
					viewBox="0 0 10 10"
					refX="8"
					refY="5"
					markerWidth="6"
					markerHeight="6"
					orient="auto-start-reverse"
				>
					<path d="M 0 0 L 10 5 L 0 10 z" className="fill-emerald-500" />
				</marker>
				<marker
					id="parrow-broken"
					viewBox="0 0 10 10"
					refX="8"
					refY="5"
					markerWidth="6"
					markerHeight="6"
					orient="auto-start-reverse"
				>
					<path d="M 0 0 L 10 5 L 0 10 z" className="fill-rose-500" />
				</marker>
				<marker
					id="parrow-partial"
					viewBox="0 0 10 10"
					refX="8"
					refY="5"
					markerWidth="6"
					markerHeight="6"
					orient="auto-start-reverse"
				>
					<path d="M 0 0 L 10 5 L 0 10 z" className="fill-amber-500" />
				</marker>
			</defs>

			{edges.map((e) => {
				const from = positions.get(e.from);
				const to = positions.get(e.to);
				if (!from || !to) return null;
				const fromX = from.x + NODE_W;
				const fromY = from.y + NODE_H / 2;
				const toX = to.x;
				const toY = to.y + NODE_H / 2;
				const flipped = toX < fromX;
				const sx = flipped ? from.x : fromX;
				const tx = flipped ? to.x + NODE_W : toX;
				const cx1 = (sx + tx) / 2;

				return (
					<path
						key={`${e.from}->${e.to}`}
						d={`M ${sx} ${fromY} C ${cx1} ${fromY}, ${cx1} ${toY}, ${tx} ${toY}`}
						className={edgeStroke(e)}
						strokeWidth={e.strength === "required" ? 2 : 1.5}
						fill="none"
						markerEnd={`url(#parrow-${edgeMarker(e)})`}
						strokeDasharray={e.strength === "info" ? "4 4" : undefined}
					/>
				);
			})}

			{nodes.map((n) => {
				const p = positions.get(n.id);
				if (!p) return null;
				const dimmed = !n.enabled || n.missing;
				return (
					<g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
						<rect
							width={NODE_W}
							height={NODE_H}
							rx={6}
							className={`${KIND_TONE[n.kind]} ${dimmed ? "opacity-50" : ""}`}
							strokeWidth={1.5}
							strokeDasharray={n.missing ? "4 3" : undefined}
						/>
						<text
							x={8}
							y={14}
							className="fill-muted-foreground text-[9px] font-mono uppercase tracking-wide"
						>
							{n.kind}
						</text>
						<text
							x={8}
							y={28}
							className={`text-[11px] font-semibold ${
								n.missing ? "fill-rose-500" : "fill-foreground"
							}`}
						>
							{truncate(n.label, 22)}
							{n.missing ? " (missing)" : ""}
							{!n.enabled && !n.missing ? " (off)" : ""}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

function edgeStroke(e: PolicyGraphEdge) {
	if (e.broken) return "stroke-rose-500 dark:stroke-rose-400";
	if (e.strength === "partial") return "stroke-amber-500 dark:stroke-amber-400";
	if (e.strength === "info") return "stroke-muted-foreground/40";
	return "stroke-emerald-500/70 dark:stroke-emerald-400/70";
}

function edgeMarker(e: PolicyGraphEdge): "ok" | "broken" | "partial" {
	if (e.broken) return "broken";
	if (e.strength === "partial") return "partial";
	return "ok";
}

function truncate(s: string, n: number) {
	return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
