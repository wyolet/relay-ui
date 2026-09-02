import { Coins } from "lucide-react";
import {
	type UsageGroupBy,
	type UsageSummaryFilter,
	type UsageWindow,
	useTokenSplit,
} from "@/api/hooks/usage";
import type { TokenKind } from "@/lib/usage-math/tokens";
import { fmtCompact, fmtPct } from "./format";
import { UsageEmpty } from "./UsageEmpty";

const KIND_DOTS: Record<TokenKind, string> = {
	input: "bg-chart-1",
	output: "bg-chart-2",
	other: "bg-muted-foreground/40",
};

/**
 * Input vs output token flow for the selected window. The split is a real
 * cost signal — output tokens price several times higher than input — plus
 * the raw per-meter breakdown (prompt, completion, cache, reasoning, …).
 */
export function TokenSplitCard({
	groupBy,
	win,
	filter,
}: {
	groupBy: UsageGroupBy;
	win: UsageWindow;
	filter?: UsageSummaryFilter;
}) {
	const split = useTokenSplit(groupBy, win, filter);

	if (split.total === 0) {
		return (
			<UsageEmpty
				icon={Coins}
				title="No tokens in this range"
				body="The input / output token split shows here once the selected window sees traffic — the ratio that drives spend."
			/>
		);
	}

	const share = (n: number) => n / split.total;

	return (
		<div className="flex flex-col rounded-lg border border-border bg-card">
			<div className="flex items-center justify-between border-b border-border px-4 py-2.5">
				<h2 className="text-sm font-medium text-foreground">Token flow</h2>
				<span className="text-[11px] text-muted-foreground">
					{fmtCompact(split.total)} total
				</span>
			</div>

			<div className="flex flex-1 flex-col justify-center gap-3 p-4">
				<div className="flex items-end justify-between gap-4">
					<EndStat
						kind="input"
						label="Input"
						value={split.input}
						share={share(split.input)}
					/>
					<EndStat
						kind="output"
						label="Output"
						value={split.output}
						share={share(split.output)}
						alignEnd
					/>
				</div>

				{/* Proportion bar: input | output | other */}
				<div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
					<Segment kind="input" share={share(split.input)} />
					<Segment kind="output" share={share(split.output)} />
					<Segment kind="other" share={share(split.other)} />
				</div>

				<dl className="flex flex-wrap gap-x-3 gap-y-1">
					{split.meters.map((m) => (
						<div
							key={m.meter}
							className="inline-flex items-center gap-1.5 text-[11px] tabular-nums"
						>
							<span
								className={`size-1.5 rounded-full ${KIND_DOTS[m.kind]}`}
								aria-hidden
							/>
							<dt className="text-muted-foreground">{m.meter}</dt>
							<dd className="font-medium text-foreground">
								{fmtCompact(m.count)}
							</dd>
						</div>
					))}
				</dl>
			</div>
		</div>
	);
}

function EndStat({
	kind,
	label,
	value,
	share,
	alignEnd = false,
}: {
	kind: TokenKind;
	label: string;
	value: number;
	share: number;
	alignEnd?: boolean;
}) {
	return (
		<div className={alignEnd ? "text-right" : ""}>
			<div
				className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ${
					alignEnd ? "justify-end" : ""
				}`}
			>
				<span
					className={`size-1.5 rounded-full ${KIND_DOTS[kind]}`}
					aria-hidden
				/>
				{label}
			</div>
			<div className="mt-1 text-xl font-semibold leading-none tabular-nums text-foreground">
				{fmtCompact(value)}
			</div>
			<div className="mt-1 text-[11px] tabular-nums text-muted-foreground">
				{fmtPct(share)}
			</div>
		</div>
	);
}

function Segment({ kind, share }: { kind: TokenKind; share: number }) {
	if (share <= 0) return null;
	return (
		<div
			className={KIND_DOTS[kind]}
			style={{ width: `${share * 100}%` }}
			aria-hidden
		/>
	);
}
