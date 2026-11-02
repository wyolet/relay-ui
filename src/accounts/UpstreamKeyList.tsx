import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { components } from "@/api/types.gen";
import { cn } from "@/lib/utils";
import { DetailEmpty } from "@/shared/DetailCard";
import { StatusInline } from "@/shared/StatusBadge";

type HostKeyView = components["schemas"]["HostKeyView"];

/**
 * The secret-free host keys of an account or pool; `ordered` numbers them,
 * `trailing` adds per-row cells after the status. A readOnly key belongs to
 * the real account behind a shared one: greyed, unlinked, never acted on.
 */
export function UpstreamKeyList<K extends HostKeyView>({
	keys,
	ordered = false,
	empty,
	trailing,
}: {
	keys: readonly K[];
	ordered?: boolean;
	empty: string;
	trailing?: (key: K) => ReactNode;
}) {
	if (keys.length === 0) return <DetailEmpty>{empty}</DetailEmpty>;
	return (
		<ol className="divide-y divide-border">
			{keys.map((k, i) => (
				<li
					key={k.id}
					className={cn(
						"flex items-center gap-3 py-2 first:pt-0 last:pb-0",
						k.readOnly && "opacity-60",
					)}
				>
					{ordered && (
						<span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
							{i + 1}
						</span>
					)}
					{k.readOnly ? (
						<span
							className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
							title="Read-only: a key of the account this one was shared from."
						>
							{k.name}
						</span>
					) : (
						<Link
							to="/host-keys/$name"
							params={{ name: k.name }}
							className="min-w-0 flex-1 truncate font-mono text-xs text-foreground hover:underline"
						>
							{k.name}
						</Link>
					)}
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
						{k.kind}
					</span>
					<StatusInline enabled={k.enabled} />
					{!k.readOnly && trailing?.(k)}
				</li>
			))}
		</ol>
	);
}
