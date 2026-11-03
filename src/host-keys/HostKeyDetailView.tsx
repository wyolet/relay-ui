import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, KeyRound, Link2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useHostKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostKeyAccountRow } from "@/host-keys/HostKeyAccountRow";
import { LinkedPolicyAction } from "@/host-keys/LinkedPolicyAction";
import type { LinkedPolicyRow } from "@/host-keys/linkedPolicies";
import { SecretRotateDialog } from "@/host-keys/SecretRotateDialog";
import { useHostKeyDetail } from "@/host-keys/useHostKeyDetail";
import { HostLogo } from "@/hosts/HostLogo";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import {
	DetailCard,
	DetailEmpty,
	DetailInline,
	DetailRow,
} from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailTable, Td } from "@/shared/DetailTable";
import { QuietBadge, StatusBadge } from "@/shared/StatusBadge";

const backLinkClass =
	"inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors";

const POLICY_COLUMNS = [
	{ label: "Policy" },
	{ label: "Status", className: "text-right" },
	{ label: "Pools", className: "text-right" },
];

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
	const diagnostics = useHostKeyDiagnostics(hk.metadata.id);
	const { account } = view;

	return (
		<div className="flex flex-col gap-5">
			{account ? (
				<Link
					to="/accounts/$name"
					params={{ name: account.name }}
					className={backLinkClass}
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{account.label}
				</Link>
			) : (
				<Link to="/keys" search={{ tab: "accounts" }} className={backLinkClass}>
					<ChevronLeft className="w-3.5 h-3.5" />
					Accounts
				</Link>
			)}

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					{view.host ? (
						<HostLogo host={view.host} size={36} className="mt-0.5 shrink-0" />
					) : (
						<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0" />
					)}
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{view.displayName}
							<StatusBadge enabled={view.enabled} />
							<QuietBadge>{view.isStored ? "Stored" : "Env"}</QuietBadge>
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{view.slug}
						</p>
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
						{view.description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{view.description}
							</p>
						)}
					</div>
				</div>
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
			</header>

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
									<KeyRound className="size-3" />
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
	);
}

function PoliciesPanel({ rows }: { rows: LinkedPolicyRow[] }) {
	if (rows.length === 0) {
		return (
			<DetailCard title="Linked by policies" icon={Link2}>
				<DetailEmpty>
					No policy links a pool holding this credential. Requests whose
					policies link no pools still reach it when it belongs to their own
					scope or to the system.
				</DetailEmpty>
			</DetailCard>
		);
	}

	return (
		<section>
			<div className="mb-2 flex items-baseline justify-between gap-2">
				<h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					Linked by policies
				</h2>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{rows.length} polic{rows.length === 1 ? "y" : "ies"}
				</span>
			</div>
			<DetailTable columns={POLICY_COLUMNS} className="mt-0">
				{rows.map((row) => (
					<tr key={row.id} className="hover:bg-muted/30 transition-colors">
						<Td>
							<div className="min-w-0">
								<Link
									to="/policies/$name"
									params={{ name: row.name }}
									className="text-foreground hover:underline truncate font-medium"
								>
									{row.label}
								</Link>
								<div className="text-[11px] text-muted-foreground font-mono truncate">
									{row.name}
								</div>
							</div>
						</Td>
						<Td className="text-right">
							{row.enabled ? (
								<span className="text-[11px] text-success">Enabled</span>
							) : (
								<span className="text-[11px] text-muted-foreground">
									Disabled
								</span>
							)}
						</Td>
						<Td className="text-right">
							<LinkedPolicyAction row={row} />
						</Td>
					</tr>
				))}
			</DetailTable>
		</section>
	);
}
