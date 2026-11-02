import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, ChevronLeft, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { AccountHolderLink } from "@/accounts/AccountHolderLink";
import { PAYLOAD_LOGGING_RULE } from "@/accounts/accountCopy";
import { ACCOUNT_KIND_LABELS } from "@/accounts/accountView";
import { DefaultAccountBadge } from "@/accounts/DefaultAccountBadge";
import { EffectiveLimits } from "@/accounts/EffectiveLimits";
import {
	PAYLOAD_LOGGING_LABELS,
	toPayloadLoggingChoice,
} from "@/accounts/payloadLogging";
import { SharedByBadge } from "@/accounts/SharedByBadge";
import { SharedWithCard } from "@/accounts/SharedWithCard";
import { useAccountDetail } from "@/accounts/useAccountDetail";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { HostCell } from "@/hosts/HostCell";
import { OwnerLink } from "@/projects/OwnerLink";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { ShortId } from "@/shared/ShortId";
import { StatusBadge, StatusInline } from "@/shared/StatusBadge";

const hintClass = "mt-0.5 text-[11px] text-muted-foreground leading-snug";

/** `keysCard` is a provider account's keys, owned by the host-keys domain. */
export function AccountDetailView({
	name,
	keysCard,
}: {
	name: string;
	keysCard: ReactNode;
}) {
	const navigate = useNavigate();
	const {
		account,
		isProvider,
		holder,
		ownerUser,
		binding,
		limits,
		sharedBy,
		source,
		host,
		hostLabel,
		deletable,
		del,
		requestDelete,
	} = useAccountDetail({
		name,
		onDeleted: () =>
			void navigate({ to: "/keys", search: { tab: "accounts" } }),
	});
	const { spec, metadata } = account;
	const isDefault = spec.default === true;
	const closed = spec.closed === true;

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

			<DetailPageHeader
				icon={Building2}
				metadata={metadata}
				badges={
					<>
						{isDefault && <DefaultAccountBadge />}
						{sharedBy !== undefined && <SharedByBadge name={sharedBy} />}
						{closed && <StatusBadge enabled={false} disabledLabel="Closed" />}
					</>
				}
			>
				<DetailHeaderActions
					enabled
					onToggle={() => undefined}
					showToggle={false}
					onDelete={requestDelete}
					deleting={del.isPending}
					showDelete={deletable}
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
			</DetailPageHeader>

			<PlanIssuesPanel kind="account" id={metadata.id} />

			<DetailCard title="Configuration" icon={Building2}>
				<dl className="divide-y divide-border">
					<DetailRow label="Kind">{ACCOUNT_KIND_LABELS[spec.kind]}</DetailRow>
					{sharedBy !== undefined && (
						<DetailRow label="Shared from">
							{source ? (
								<Link
									to="/accounts/$name"
									params={{ name: source.name }}
									className="hover:underline"
								>
									{source.label}
								</Link>
							) : (
								<span>An account of {sharedBy}</span>
							)}
							<p className={hintClass}>
								Uses that account's keys, read-only. Requests count on its
								limits; the policy bound here only narrows them.
							</p>
						</DetailRow>
					)}
					{holder && (
						<DetailRow label="Holder">
							<AccountHolderLink holder={holder} />
						</DetailRow>
					)}
					<DetailRow label="Owner">
						{ownerUser ? (
							<AccountHolderLink holder={ownerUser} />
						) : (
							<OwnerLink owner={metadata.owner} />
						)}
					</DetailRow>
					{spec.kind === "member" && (
						<DetailRow label="Membership">
							{closed ? "Closed" : "Open"}
							{closed && (
								<p className={hintClass}>
									The membership ended: keys in this account are refused with
									account_closed until a role grants it again.
								</p>
							)}
						</DetailRow>
					)}
					{!isProvider && (
						<DetailRow label="Payload logging">
							{
								PAYLOAD_LOGGING_LABELS[
									toPayloadLoggingChoice(spec.payloadLogging)
								]
							}
							<p className={hintClass}>{PAYLOAD_LOGGING_RULE}</p>
						</DetailRow>
					)}
					{isProvider && (
						<>
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
									<HostCell
										host={undefined}
										fallbackLabel={hostLabel}
										size="sm"
									/>
								)}
							</DetailRow>
							<DetailRow label="Organization id">
								{spec.orgId ? (
									<ShortId value={spec.orgId} />
								) : (
									<span className="text-muted-foreground">Not known yet</span>
								)}
							</DetailRow>
							<DetailRow label="Default">
								{isDefault ? "Yes" : "No"}
								<p className={hintClass}>
									{isDefault
										? "Keys of this owner at this host join it when they name no account. A provider 429 cools only the key that got it."
										: "A provider 429 on one key cools every key in this account for the requested model."}
								</p>
							</DetailRow>
						</>
					)}
				</dl>
			</DetailCard>

			<DetailCard title="Policy" icon={Shield}>
				{binding ? (
					<dl className="divide-y divide-border">
						<DetailRow label="Policy">
							{binding.policy ? (
								<Link
									to="/policies/$name"
									params={{ name: binding.policy.name }}
									className="hover:underline"
								>
									{binding.policy.label}
								</Link>
							) : (
								<span className="text-muted-foreground">Not visible</span>
							)}
						</DetailRow>
						<DetailRow label="Binding">
							<span className="inline-flex items-center gap-2">
								<Link
									to="/policy-bindings/$name"
									params={{ name: binding.name }}
									className="hover:underline"
								>
									{binding.label}
								</Link>
								<StatusInline enabled={binding.enabled} />
							</span>
						</DetailRow>
					</dl>
				) : (
					<DetailEmpty>No policy binding names this account.</DetailEmpty>
				)}
			</DetailCard>

			<EffectiveLimits state={limits} />

			{isProvider && keysCard}

			<SharedWithCard account={account} />

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
