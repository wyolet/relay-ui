import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, Link2, ShieldCheck } from "lucide-react";
import { CheckAccessButton } from "@/access-review/CheckAccessButton";
import {
	useDeleteServiceAccount,
	useServiceAccount,
	useServiceAccountReferences,
} from "@/api/hooks/serviceAccounts";
import { displayLabel } from "@/lib/displayLabel";
import { serviceAccountOwner } from "@/lib/serviceAccountScope";
import { EraseBodiesButton } from "@/logs/EraseBodiesButton";
import { AccountPolicy } from "@/policy-bindings/AccountPolicy";
import { InheritedPolicies } from "@/policy-bindings/InheritedPolicies";
import type { AccountRef } from "@/policy-bindings/useAccountPolicy";
import { OwnerLink } from "@/projects/OwnerLink";
import { useToggleServiceAccountEnabled } from "@/service-accounts/useToggleServiceAccountEnabled";
import { BackLink } from "@/shared/BackLink";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { ReferencesList } from "@/shared/ReferencesList";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { ShortcutActions } from "@/shortcuts/ShortcutActions";

export function ServiceAccountDetailView({ name }: { name: string }) {
	const { data: sa } = useServiceAccount(name);
	const { data: refs } = useServiceAccountReferences(sa.metadata.id);
	const { setEnabled, isPending: isToggling } =
		useToggleServiceAccountEnabled();
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeleteServiceAccount(), {
		noun: "service account",
		onDeleted: () => void navigate({ to: "/service-accounts" }),
	});

	const enabled = sa.spec.enabled !== false;
	const owner = serviceAccountOwner(sa);
	const accountRef: AccountRef = {
		ownerOf: { kind: "serviceaccount", id: sa.metadata.id ?? "" },
	};

	return (
		<div>
			<DetailPageHeader
				back={<BackLink to="/service-accounts">Service accounts</BackLink>}
				icon={Bot}
				metadata={sa.metadata}
				badges={<StatusBadge enabled={enabled} />}
			>
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => void setEnabled(sa, !enabled)}
					toggling={isToggling}
					onDelete={() =>
						del.request({
							id: sa.metadata.id ?? "",
							name: sa.metadata.name,
							label: displayLabel(sa.metadata),
						})
					}
					editLink={({ className, content }) => (
						<Link
							to="/service-accounts/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				>
					<ShortcutActions
						target={{
							kind: "serviceaccount",
							id: sa.metadata.id ?? "",
							name: sa.metadata.name,
							label: displayLabel(sa.metadata),
							labels: sa.metadata.labels ?? undefined,
						}}
					/>
					<CheckAccessButton
						subject={{ kind: "serviceaccount", name: sa.metadata.name }}
						subjectLabel={displayLabel(sa.metadata)}
						size="lg"
					/>
					<EraseBodiesButton
						scope={{
							principal: {
								id: sa.metadata.id ?? "",
								name: sa.metadata.name,
								label: displayLabel(sa.metadata),
								kind: "service account",
							},
						}}
					/>
				</DetailHeaderActions>
			</DetailPageHeader>

			<div className="flex flex-col gap-5">
				<DetailCard title="Configuration" icon={ShieldCheck}>
					<dl className="divide-y divide-border">
						<DetailRow label="Owner">
							<OwnerLink owner={owner} showUser />
						</DetailRow>
						<AccountPolicy
							accountRef={accountRef}
							{...(owner
								? { attach: { label: displayLabel(sa.metadata), owner } }
								: {})}
						/>
						<InheritedPolicies accountRef={accountRef} />
					</dl>
				</DetailCard>

				<DetailCard title="References" icon={Link2}>
					<ReferencesList
						items={refs.items}
						empty="Nothing points at this service account yet."
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
		</div>
	);
}
