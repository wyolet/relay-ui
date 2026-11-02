import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, KeyRound, Layers } from "lucide-react";
import { UpstreamKeyList } from "@/accounts/UpstreamKeyList";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { HostCell } from "@/hosts/HostCell";
import { SELECTION_LABELS } from "@/pools/poolKeys";
import { usePoolDetail } from "@/pools/usePoolDetail";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";

export function PoolDetailView({ name }: { name: string }) {
	const navigate = useNavigate();
	const { pool, keys, selection, host, hostLabel, del, requestDelete } =
		usePoolDetail({
			name,
			onDeleted: () => void navigate({ to: "/keys", search: { tab: "pools" } }),
		});

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

			<DetailPageHeader icon={Layers} metadata={pool.metadata}>
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
			</DetailPageHeader>

			<PlanIssuesPanel kind="pool" id={pool.metadata.id} />

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
