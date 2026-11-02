import { Layers, Settings2 } from "lucide-react";
import type { Model } from "@/api/types/model";
import { fmtTokens } from "@/lib/format";
import { DetailCard, DetailRow } from "@/shared/DetailCard";

export function ModelLimitsTab({ model }: { model: Model }) {
	return (
		<div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
			<DetailCard title="Context window" icon={Settings2}>
				<dl className="divide-y divide-border">
					<DetailRow label="Total">
						<TokenValue n={model.spec.contextWindowTotal} />
					</DetailRow>
					<DetailRow label="Input">
						<TokenValue n={model.spec.contextWindowInput} />
					</DetailRow>
					<DetailRow label="Output">
						<TokenValue n={model.spec.contextWindowOutput} />
					</DetailRow>
					<DetailRow label="Max output">
						<TokenValue n={model.spec.maxOutputTokens} />
					</DetailRow>
				</dl>
			</DetailCard>
			<DetailCard title="Modalities" icon={Layers}>
				<dl className="divide-y divide-border">
					<DetailRow label="Input">
						<ModalityList items={model.spec.modalities?.input} />
					</DetailRow>
					<DetailRow label="Output">
						<ModalityList items={model.spec.modalities?.output} />
					</DetailRow>
				</dl>
			</DetailCard>
		</div>
	);
}

function TokenValue({ n }: { n: number | undefined }) {
	if (!n) return <Dash />;
	return (
		<span className="font-mono tabular-nums text-foreground">
			{fmtTokens(n)}
		</span>
	);
}

function ModalityList({
	items,
}: {
	items: readonly string[] | null | undefined;
}) {
	if (!items || items.length === 0) return <Dash />;
	return (
		<ul className="flex flex-wrap gap-1.5">
			{items.map((m) => (
				<li
					key={m}
					className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border capitalize"
				>
					{m}
				</li>
			))}
		</ul>
	);
}

function Dash() {
	return <span className="text-muted-foreground/70">—</span>;
}
