import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, ChevronLeft, KeyRound } from "lucide-react";
import { DefaultAccountBadge } from "@/accounts/DefaultAccountBadge";
import { UpstreamKeyList } from "@/accounts/UpstreamKeyList";
import { useAccountDetail } from "@/accounts/useAccountDetail";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";

export function AccountDetailView({ name }: { name: string }) {
	const navigate = useNavigate();
	const { account, keys, host, hostLabel, del, requestDelete } =
		useAccountDetail({
			name,
			onDeleted: () =>
				void navigate({ to: "/keys", search: { tab: "accounts" } }),
		});
	const description = account.metadata.description?.trim();
	const isDefault = account.spec.default === true;

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/keys"
				search={{ tab: "accounts" }}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Accounts
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<Building2 className="w-4 h-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(account.metadata)}
							{!hasDisplayName(account.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							{isDefault && <DefaultAccountBadge />}
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{account.metadata.name}
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
							to="/accounts/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</header>

			<DetailCard title="Configuration" icon={Building2}>
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
					<DetailRow label="Organization id">
						{account.spec.orgId ? (
							<code className="font-mono text-[11px]">
								{account.spec.orgId}
							</code>
						) : (
							<span className="text-muted-foreground">Not known yet</span>
						)}
					</DetailRow>
					<DetailRow label="Default">
						{isDefault ? "Yes" : "No"}
						<p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
							{isDefault
								? "Keys of this owner at this host join it when they name no account. A provider 429 cools only the key that got it."
								: "A provider 429 on one key cools every key in this account for the requested model."}
						</p>
					</DetailRow>
				</dl>
			</DetailCard>

			<DetailCard title={`Keys · ${keys.length}`} icon={KeyRound}>
				<UpstreamKeyList
					keys={keys}
					empty="No credentials name this account."
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
