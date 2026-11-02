import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, KeyRound, Layers } from "lucide-react";
import { UpstreamKeyList } from "@/accounts/UpstreamKeyList";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { SELECTION_LABELS } from "@/pools/poolKeys";
import { usePoolDetail } from "@/pools/usePoolDetail";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";

export function PoolDetailView({ name }: { name: string }) {
	const navigate = useNavigate();
	const { pool, keys, selection, host, hostLabel, del, requestDelete } =
		usePoolDetail({
			name,
			onDeleted: () => void navigate({ to: "/keys", search: { tab: "pools" } }),
		});
	const description = pool.metadata.description?.trim();

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/keys"
				search={{ tab: "pools" }}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Pools
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<Layers className="w-4 h-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(pool.metadata)}
							{!hasDisplayName(pool.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{pool.metadata.name}
						</p>
						{description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</div>
				</div>
				<DetailHeaderActions
					enabled
					onToggle={() => undefined}
					showToggle={false}
					onDelete={requestDelete}
					deleting={del.isPending}
					editLink={({ className, content }) => (
						<Link
							to="/pools/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</header>

			<DetailCard title="Configuration" icon={Layers}>
				<dl className="divide-y divide-border">
					<DetailRow label="Host">
						{host ? (
							<Link
								to="/hosts/$name"
								params={{ name: host.metadata.name }}
								className="inline-block hover:underline"
							>
								<HostCell host={host} size="sm" />
							</Link>
						) : (
							<HostCell host={undefined} fallbackLabel={hostLabel} size="sm" />
						)}
					</DetailRow>
					<DetailRow label="Selection">
						{SELECTION_LABELS[selection].label}
						<p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
							{SELECTION_LABELS[selection].hint}
						</p>
					</DetailRow>
				</dl>
			</DetailCard>

			<DetailCard title={`Keys · ${keys.length}`} icon={KeyRound}>
				<UpstreamKeyList
					keys={keys}
					ordered={selection === "prioritized"}
					empty="This pool has no keys. A policy linking it routes nothing through it."
				/>
			</DetailCard>

			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</div>
	);
}
