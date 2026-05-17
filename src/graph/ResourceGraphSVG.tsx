/**
 * Static structural diagram of how relay resources relate. No data — just
 * the type-level shape and edge strengths. Lives on the dashboard as a
 * mental model for operators.
 */

interface NodeBox {
	id: string;
	label: string;
	x: number;
	y: number;
	tone: "catalog" | "credential" | "config" | "client";
}

interface Edge {
	from: string;
	to: string;
	strength: "required" | "partial" | "info";
	label?: string;
	curveOffset?: number;
}

const NODES: NodeBox[] = [
	{ id: "provider", label: "Provider", x: 40, y: 40, tone: "catalog" },
	{ id: "host", label: "Host", x: 220, y: 40, tone: "catalog" },
	{ id: "model", label: "Model", x: 220, y: 140, tone: "catalog" },
	{ id: "hostKey", label: "HostKey", x: 420, y: 40, tone: "credential" },
	{ id: "rateLimit", label: "RateLimit", x: 420, y: 240, tone: "config" },
	{ id: "policy", label: "Policy", x: 620, y: 140, tone: "config" },
	{ id: "relayKey", label: "RelayKey", x: 820, y: 140, tone: "client" },
];

const EDGES: Edge[] = [
	{ from: "host", to: "provider", strength: "info", label: "owned by" },
	{ from: "model", to: "provider", strength: "info", label: "owned by" },
	{ from: "model", to: "host", strength: "info", label: "served by" },
	{ from: "hostKey", to: "host", strength: "required", label: "belongs to" },
	{ from: "policy", to: "hostKey", strength: "required", label: "hostKeyIds" },
	{
		from: "policy",
		to: "rateLimit",
		strength: "partial",
		label: "rlBindings",
	},
	{ from: "relayKey", to: "policy", strength: "required", label: "uses" },
];

const NODE_W = 116;
const NODE_H = 44;

function strengthColor(s: Edge["strength"]) {
	switch (s) {
		case "required":
			return "stroke-rose-500 dark:stroke-rose-400";
		case "partial":
			return "stroke-amber-500 dark:stroke-amber-400";
		case "info":
			return "stroke-muted-foreground/40";
	}
}

function toneFill(t: NodeBox["tone"]) {
	switch (t) {
		case "catalog":
			return "fill-sky-50 dark:fill-sky-950 stroke-sky-500/60";
		case "credential":
			return "fill-violet-50 dark:fill-violet-950 stroke-violet-500/60";
		case "config":
			return "fill-emerald-50 dark:fill-emerald-950 stroke-emerald-500/60";
		case "client":
			return "fill-amber-50 dark:fill-amber-950 stroke-amber-500/60";
	}
}

function nodeById(id: string): NodeBox {
	const n = NODES.find((x) => x.id === id);
	if (!n) throw new Error(`Unknown node: ${id}`);
	return n;
}

function edgePath(e: Edge): { d: string; midX: number; midY: number } {
	const a = nodeById(e.from);
	const b = nodeById(e.to);
	const ax = a.x + NODE_W / 2;
	const ay = a.y + NODE_H / 2;
	const bx = b.x + NODE_W / 2;
	const by = b.y + NODE_H / 2;

	// Anchor on the edge of the box for cleaner endpoints.
	const dx = bx - ax;
	const dy = by - ay;
	const horiz = Math.abs(dx) > Math.abs(dy);
	const fromX = horiz ? ax + Math.sign(dx) * (NODE_W / 2) : ax;
	const fromY = horiz ? ay : ay + Math.sign(dy) * (NODE_H / 2);
	const toX = horiz ? bx - Math.sign(dx) * (NODE_W / 2) : bx;
	const toY = horiz ? by : by - Math.sign(dy) * (NODE_H / 2);

	const midX = (fromX + toX) / 2;
	const midY = (fromY + toY) / 2;
	return {
		d: `M ${fromX} ${fromY} L ${toX} ${toY}`,
		midX,
		midY,
	};
}

export function ResourceGraphSVG() {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<div className="flex items-baseline justify-between mb-3">
				<h3 className="text-sm font-semibold text-foreground">
					Resource dependency graph
				</h3>
				<Legend />
			</div>
			<svg
				viewBox="0 0 960 320"
				className="w-full h-auto"
				role="img"
				aria-label="Relay resource dependency graph"
			>
				<defs>
					<marker
						id="arrow-required"
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
						id="arrow-partial"
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="6"
						markerHeight="6"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" className="fill-amber-500" />
					</marker>
					<marker
						id="arrow-info"
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="6"
						markerHeight="6"
						orient="auto-start-reverse"
					>
						<path
							d="M 0 0 L 10 5 L 0 10 z"
							className="fill-muted-foreground/50"
						/>
					</marker>
				</defs>

				{EDGES.map((e) => {
					const { d, midX, midY } = edgePath(e);
					return (
						<g key={`${e.from}->${e.to}`}>
							<path
								d={d}
								className={`${strengthColor(e.strength)} fill-none`}
								strokeWidth={e.strength === "required" ? 2 : 1.5}
								strokeDasharray={e.strength === "info" ? "4 4" : undefined}
								markerEnd={`url(#arrow-${e.strength})`}
							/>
							{e.label && (
								<text
									x={midX}
									y={midY - 6}
									textAnchor="middle"
									className="fill-muted-foreground text-[9px] font-mono"
								>
									{e.label}
								</text>
							)}
						</g>
					);
				})}

				{NODES.map((n) => (
					<g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
						<rect
							width={NODE_W}
							height={NODE_H}
							rx={8}
							className={toneFill(n.tone)}
							strokeWidth={1.5}
						/>
						<text
							x={NODE_W / 2}
							y={NODE_H / 2 + 4}
							textAnchor="middle"
							className="fill-foreground text-[12px] font-semibold"
						>
							{n.label}
						</text>
					</g>
				))}
			</svg>
		</div>
	);
}

function Legend() {
	return (
		<div className="flex items-center gap-3 text-[10px] text-muted-foreground">
			<LegendDot className="bg-rose-500" label="required (blocks enable)" />
			<LegendDot className="bg-amber-500" label="partial (per-model)" />
			<LegendDot className="bg-muted-foreground/40" label="info (catalog)" />
		</div>
	);
}

function LegendDot({ className, label }: { className: string; label: string }) {
	return (
		<span className="flex items-center gap-1">
			<span className={`inline-block w-2 h-2 rounded-full ${className}`} />
			{label}
		</span>
	);
}
