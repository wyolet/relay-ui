import { useMemo } from "react";
import { Boxes } from "lucide-react";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import type { Policy } from "@/api/types/policy";
import { KIND_META } from "@/config/catalogRef";
import {
	parseCatalogRef,
	refCovers,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";

interface Props {
	policy: Policy;
}

/**
 * Read-only view of a policy's catalog grants. Each ref shows its DSL form,
 * its kind, and the concrete bindings it resolves to from the local catalog.
 */
export function PolicyModelsTab({ policy }: Props) {
	const { data: providers } = useProviders();
	const { data: models } = useModels();
	const { data: hosts } = useHosts();

	const catalog = useMemo(
		() =>
			buildConcreteCatalog({
				providers: providers.items ?? [],
				models: models.items ?? [],
				hosts: hosts.items ?? [],
				includeDeprecated: policy.spec.includeDeprecated ?? false,
			}),
		[providers, models, hosts, policy.spec.includeDeprecated],
	);

	const refs = policy.spec.models ?? [];

	if (refs.length === 0) {
		return (
			<EmptyState
				title="No catalog refs"
				message="This policy currently grants nothing. Add catalog refs in the edit form."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-3 pt-2">
			{refs.map((raw) => (
				<RefRow key={raw} raw={raw} catalog={catalog} />
			))}
		</div>
	);
}

function RefRow({
	raw,
	catalog,
}: {
	raw: string;
	catalog: ReturnType<typeof buildConcreteCatalog>;
}) {
	const err = validateCatalogRef(raw);
	if (err) {
		return (
			<div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
				<code className="font-mono">{raw}</code>{" "}
				<span className="text-destructive text-xs">— {err}</span>
			</div>
		);
	}
	const parsed = parseCatalogRef(raw);
	const matches = catalog.filter((b) => refCovers(parsed, b));
	const meta = KIND_META[parsed.kind];

	return (
		<div className="rounded-md border border-border bg-card overflow-hidden">
			<div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30">
				<code className="font-mono text-sm text-foreground">{raw}</code>
				<KindChip label={meta?.label ?? parsed.kind} />
				<span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
					{matches.length} binding{matches.length === 1 ? "" : "s"}
				</span>
			</div>
			{matches.length === 0 ? (
				<div className="px-3 py-2 text-xs text-muted-foreground">
					Doesn't match any current binding.
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 px-3 py-2">
					{matches.slice(0, 18).map((b) => (
						<div
							key={`${b.provider}/${b.model}@${b.host}`}
							className="text-[11px] text-muted-foreground truncate"
						>
							<span className="text-foreground">{b.model}</span>
							<span className="text-muted-foreground/60"> @ </span>
							<span>{b.host}</span>
						</div>
					))}
					{matches.length > 18 && (
						<div className="text-[11px] text-muted-foreground col-span-full">
							+{matches.length - 18} more…
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function KindChip({ label }: { label: string }) {
	return (
		<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
			<Boxes className="w-3 h-3" aria-hidden />
			{label}
		</span>
	);
}

function EmptyState({ title, message }: { title: string; message: string }) {
	return (
		<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-0.5 text-xs text-muted-foreground">{message}</div>
		</div>
	);
}
