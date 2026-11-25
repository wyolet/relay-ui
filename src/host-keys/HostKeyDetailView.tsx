import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Link2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { usePlanDiagnostics } from "@/diagnostics/usePlanDiagnostics";
import { HostKeyAccountRow } from "@/host-keys/HostKeyAccountRow";
import { LinkedPolicyAction } from "@/host-keys/LinkedPolicyAction";
import type { LinkedPolicyRow } from "@/host-keys/linkedPolicies";
import { SecretRotateDialog } from "@/host-keys/SecretRotateDialog";
import { useHostKeyDetail } from "@/host-keys/useHostKeyDetail";
import { HostLogo } from "@/hosts/HostLogo";
import { BackLink } from "@/shared/BackLink";
import { logoSize } from "@/shared/CatalogIcon";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import {
	DetailCard,
	DetailEmpty,
	DetailInline,
	DetailListRow,
	DetailRow,
} from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { LastUsed } from "@/shared/LastUsed";
import { QuietBadge, StatusBadge, StatusInline } from "@/shared/StatusBadge";

export function HostKeyDetailView({ name }: { name: string }) {
	const navigate = useNavigate();
	const {
		hk,
		view,
		attachedPolicies,
		confirming,
		rotating,
		isDeletingPending,
		deleteError,
		attemptDelete,
		confirmDelete,
		cancelDelete,
		openRotate,
		closeRotate,
		setEnabled,
		isToggling,
	} = useHostKeyDetail({
		name,
		onDeleted: (accountName) =>
			void (accountName
				? navigate({ to: "/accounts/$name", params: { name: accountName } })
				: navigate({ to: "/keys", search: { tab: "accounts" } })),
	});
	const diagnostics = usePlanDiagnostics("credential", hk.metadata.id);
	const { account } = view;

	return (
		<div>
			<DetailPageHeader
				back={
					account ? (
						<BackLink to="/accounts/$name" params={{ name: account.name }}>
							{account.label}
						</BackLink>
					) : (
						<BackLink to="/keys" search={{ tab: "accounts" }}>
							Accounts
						</BackLink>
					)
				}
				icon={KeyRound}
				mark={
					view.host ? (
						<HostLogo host={view.host} size={logoSize.header} />
					) : undefined
				}
				metadata={hk.metadata}
				badges={
					<>
						<StatusBadge enabled={view.enabled} />
						<QuietBadge>{view.isStored ? "Stored" : "Env"}</QuietBadge>
					</>
				}
				extra={
					<p className="mt-0.5 text-[11px] text-muted-foreground">
						on{" "}
						{view.hostName ? (
							<Link
								to="/hosts/$name"
								params={{ name: view.hostName }}
								className="text-foreground hover:underline"
							>
								{view.hostLabel}
							</Link>
						) : (
							<span className="text-foreground">{view.hostLabel}</span>
						)}
						{account && (
							<>
								{" "}
								in{" "}
								<Link
									to="/accounts/$name"
									params={{ name: account.name }}
									className="text-foreground hover:underline"
								>
									{account.label}
								</Link>
							</>
						)}
					</p>
				}
			>
				<DetailHeaderActions
					enabled={view.enabled}
					onToggle={() => void setEnabled(!view.enabled)}
					toggling={isToggling}
					onDelete={attemptDelete}
					editLink={({ className, content }) => (
						<Link
							to="/host-keys/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</DetailPageHeader>

			<div className="flex flex-col gap-5">
				<DiagnosticList diagnostics={diagnostics} />

				<DetailCard title="Configuration" icon={ShieldCheck}>
					<dl className="divide-y divide-border">
						<DetailRow label="Account">
							<HostKeyAccountRow
								key={view.id}
								hostKeyId={view.id}
								account={view.account}
							/>
						</DetailRow>
						<DetailRow label="Last used">
							<LastUsed at={view.lastUsedAt} />
						</DetailRow>
						{view.defaultTier && (
							<DetailRow label="Default tier">
								<span className="font-mono text-foreground">
									{view.defaultTier}
								</span>
							</DetailRow>
						)}
						<DetailRow label="Secret">
							{view.isStored ? (
								<DetailInline>
									<span className="font-mono text-sm text-muted-foreground">
										••••••••••••
									</span>
									<QuietBadge>Encrypted at rest</QuietBadge>
									<Button type="button" variant="outline" onClick={openRotate}>
										<KeyRound data-icon="inline-start" className="size-3" />
										Rotate
									</Button>
								</DetailInline>
							) : view.envVar ? (
								<DetailInline>
									<code className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-mono text-foreground">
										${view.envVar}
									</code>
									<span className="text-[11px] text-muted-foreground">
										resolved at request time
									</span>
								</DetailInline>
							) : (
								<span className="text-[11px] text-destructive">
									No env var configured.
								</span>
							)}
						</DetailRow>
					</dl>
				</DetailCard>

				<PoliciesPanel rows={attachedPolicies} />

				{rotating && <SecretRotateDialog hk={hk} onClose={closeRotate} />}

				{confirming && (
					<DeleteConfirm
						resourceName={view.slug}
						onConfirm={() => void confirmDelete()}
						onCancel={cancelDelete}
						isPending={isDeletingPending}
						error={deleteError}
					/>
				)}
			</div>
		</div>
	);
}

function PoliciesPanel({ rows }: { rows: LinkedPolicyRow[] }) {
	return (
		<DetailCard title="Linked by policies" count={rows.length} icon={Link2}>
			{rows.length === 0 ? (
				<DetailEmpty>
					No policy links a pool holding this credential. Requests whose
					policies link no pools still reach it when it belongs to their own
					scope or to the system.
				</DetailEmpty>
			) : (
				<ul className="divide-y divide-border">
					{rows.map((row) => (
						<DetailListRow key={row.id}>
							<Link
								to="/policies/$name"
								params={{ name: row.name }}
								className="min-w-0 truncate text-foreground hover:underline"
							>
								{row.label}
							</Link>
							<span className="flex shrink-0 items-center gap-3">
								<LinkedPolicyAction row={row} />
								<StatusInline enabled={row.enabled} />
							</span>
						</DetailListRow>
					))}
				</ul>
			)}
		</DetailCard>
	);
}
