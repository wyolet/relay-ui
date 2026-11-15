import { Link } from "@tanstack/react-router";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import type { ModelHostLine } from "@/lib/modelHostLines";
import { RATE_COLUMNS } from "@/lib/pricingMatrix";
import { RateValue } from "@/pricing/MeterGrid";
import { AddPriceLink } from "@/pricing/ModelPrice";
import { Section } from "@/shared/Section";
import { TextPlaceholder } from "@/shared/TextPlaceholder";
import { fmtCompact, fmtMoneyCompact } from "@/usage/format";

/** Each host serving the model: how relay calls it there, what it charges,
 * and how much of the model's last 7 days went through it. */
export function ModelHostList({
	lines,
	modelId,
}: {
	lines: ModelHostLine[];
	modelId: string | undefined;
}) {
	return (
		<Section
			title="Where it runs"
			meta={lines.length > 0 ? "per 1M tokens · last 7 days" : undefined}
		>
			{lines.length === 0 ? (
				<p className="text-label text-ink-2">
					No host serves this model yet. It appears here once a host's catalog
					binds it.
				</p>
			) : (
				<ul className="grid grid-cols-1">
					{lines.map((line) => (
						<HostLine key={line.host.id} line={line} modelId={modelId} />
					))}
				</ul>
			)}
		</Section>
	);
}

function HostLine({
	line,
	modelId,
}: {
	line: ModelHostLine;
	modelId: string | undefined;
}) {
	return (
		<li
			className={`grid grid-cols-1 gap-1.5 border-b border-rule py-3 first:pt-0 ${line.enabled ? "" : "opacity-60"}`}
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<span className="flex min-w-0 items-center gap-2">
					<HostLogo host={hostRefLogo(line.host)} size={18} />
					<Link
						to="/hosts/$name"
						params={{ name: line.host.name }}
						className="truncate text-label font-medium text-foreground hover:underline"
					>
						{line.label}
					</Link>
					<span className="shrink-0 text-meta text-ink-3">{line.adapter}</span>
					{line.upstreamName && (
						<code
							className="truncate font-mono text-foot text-ink-3"
							title="Model name sent upstream"
						>
							as {line.upstreamName}
						</code>
					)}
					{!line.enabled && (
						<span className="shrink-0 text-foot text-ink-3">off</span>
					)}
				</span>
				<HostTraffic usage={line.usage} />
			</div>
			<div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 pl-6.5 text-label tabular-nums">
				<Rates line={line} modelId={modelId} />
			</div>
		</li>
	);
}

function HostTraffic({ usage }: { usage: ModelHostLine["usage"] }) {
	if (!usage) {
		return (
			<span className="text-meta">
				<TextPlaceholder width="w-24" />
			</span>
		);
	}
	if (usage.requests === 0) {
		return <span className="text-meta text-ink-3">no traffic</span>;
	}
	return (
		<span className="shrink-0 text-meta text-ink-2 tabular-nums">
			{fmtCompact(usage.requests)} requests
			{usage.usd != null && ` · ${fmtMoneyCompact(usage.usd, "USD")}`}
		</span>
	);
}

function Rates({
	line,
	modelId,
}: {
	line: ModelHostLine;
	modelId: string | undefined;
}) {
	const { rates } = line;
	if (rates.kind === "loading") return <TextPlaceholder width="w-48" />;
	if (rates.kind === "unpriced") {
		if (!modelId) return <span className="text-warn">Unpriced</span>;
		return (
			<AddPriceLink
				hostId={line.host.id}
				modelId={modelId}
				className="text-warn hover:underline"
				title={`Add a price on ${line.label}`}
			>
				Unpriced · add a price →
			</AddPriceLink>
		);
	}
	return (
		<>
			{RATE_COLUMNS.map(({ meter, label }) => {
				const cell = rates.cells[meter];
				if (!cell) return null;
				return (
					<span key={meter} className="inline-flex items-baseline gap-1.5">
						<span className="text-meta text-ink-3">{label}</span>
						<RateValue cell={cell} currency={rates.currency} />
					</span>
				);
			})}
			{rates.extra > 0 && (
				<span className="text-meta text-ink-3">+{rates.extra} more</span>
			)}
			{rates.sheet && (
				<Link
					to="/pricing/$name"
					params={{ name: rates.sheet }}
					className="text-meta text-ink-3 hover:text-foreground"
				>
					Rate sheet →
				</Link>
			)}
		</>
	);
}
