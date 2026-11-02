import { Link } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { ShareAccountDialog } from "@/accounts/ShareAccountDialog";
import { SharePartyLink } from "@/accounts/SharePartyLink";
import { useSharedWith } from "@/accounts/useSharedWith";
import type { Account } from "@/api/hooks/accounts";
import { Button } from "@/components/ui/button";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty } from "@/shared/DetailCard";
import { RowMenu } from "@/shared/RowMenu";

const EMPTY_TEXT = {
	loading: "Loading…",
	failed: "Couldn't load who this account is shared with.",
	ready:
		"Not shared. Sharing gives a user, team, project or service account this account's keys, never their secrets.",
} as const;

/** For the owner of a provider account: who it is shared with, and their usage over 30 days. */
export function SharedWithCard({ account }: { account: Account }) {
	const {
		canShare,
		rows,
		status,
		sharing,
		openShare,
		closeShare,
		del,
		requestRemove,
	} = useSharedWith(account);
	if (!canShare) return null;

	return (
		<DetailCard
			title={`Shared with · ${rows.length}`}
			icon={Share2}
			action={
				<Button type="button" variant="outline" size="sm" onClick={openShare}>
					Share
				</Button>
			}
		>
			{rows.length === 0 ? (
				<DetailEmpty>{EMPTY_TEXT[status]}</DetailEmpty>
			) : (
				<ul className="divide-y divide-border">
					<li className="flex items-center gap-3 pb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
						<span className="w-40 shrink-0">Receiver</span>
						<span className="min-w-0 flex-1">Shared account</span>
						<span className="shrink-0">Last 30 days</span>
						<span className="w-7 shrink-0" aria-hidden />
					</li>
					{rows.map((row) => (
						<li key={row.id} className="flex items-center gap-3 py-2 last:pb-0">
							<span className="w-40 shrink-0 min-w-0 truncate">
								<SharePartyLink party={row.receiver} />
							</span>
							<Link
								to="/accounts/$name"
								params={{ name: row.name }}
								className="min-w-0 flex-1 truncate font-mono text-xs text-foreground hover:underline"
							>
								{row.name}
							</Link>
							<span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
								{row.usage}
							</span>
							<RowMenu
								actions={[
									{
										label: "Remove",
										danger: true,
										onClick: () => requestRemove(row),
									},
								]}
							/>
						</li>
					))}
				</ul>
			)}

			{sharing && <ShareAccountDialog account={account} onClose={closeShare} />}

			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					description="The receiver loses this account's keys, and pools that draw on the shared account lose it."
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</DetailCard>
	);
}
