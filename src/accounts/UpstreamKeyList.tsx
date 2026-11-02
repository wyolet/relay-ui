import { Link } from "@tanstack/react-router";
import type { components } from "@/api/types.gen";
import { DetailEmpty } from "@/shared/DetailCard";
import { StatusInline } from "@/shared/StatusBadge";

type HostKeyView = components["schemas"]["HostKeyView"];

/** The secret-free host keys of an account or pool; `ordered` numbers them. */
export function UpstreamKeyList({
	keys,
	ordered = false,
	empty,
}: {
	keys: readonly HostKeyView[];
	ordered?: boolean;
	empty: string;
}) {
	if (keys.length === 0) return <DetailEmpty>{empty}</DetailEmpty>;
	return (
		<ol className="divide-y divide-border">
			{keys.map((k, i) => (
				<li
					key={k.id}
					className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
				>
					{ordered && (
						<span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
							{i + 1}
						</span>
					)}
					<Link
						to="/host-keys/$name"
						params={{ name: k.name }}
						className="min-w-0 flex-1 truncate font-mono text-xs text-foreground hover:underline"
					>
						{k.name}
					</Link>
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
						{k.kind}
					</span>
					<StatusInline enabled={k.enabled} />
				</li>
			))}
		</ol>
	);
}
