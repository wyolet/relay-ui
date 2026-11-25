import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, ShieldCheck } from "lucide-react";
import { usePolicies } from "@/api/hooks/policies";
import {
	useDeletePolicyBinding,
	usePolicyBinding,
} from "@/api/hooks/policyBindings";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { displayLabel } from "@/lib/displayLabel";
import { AccountChips } from "@/policy-bindings/AccountChips";
import { BindingOwner } from "@/policy-bindings/BindingOwner";
import { BackLink } from "@/shared/BackLink";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function PolicyBindingDetailView({ name }: { name: string }) {
	const { data: binding } = usePolicyBinding(name);
	const { data: policiesData } = usePolicies();
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeletePolicyBinding(), {
		noun: "policy binding",
		onDeleted: () =>
			void navigate({ to: "/policies", search: { tab: "bindings" } }),
	});

	const enabled = binding.spec.enabled !== false;
	const labels = Object.entries(binding.metadata.labels ?? {});
	const accountIds = binding.spec.accountIds ?? [];
	const policy = (policiesData.items ?? []).find(
		(p) => p.metadata.id === binding.spec.policyId,
	);

	return (
		<div>
			<DetailPageHeader
				back={
					<BackLink to="/policies" search={{ tab: "bindings" }}>
						Policy bindings
					</BackLink>
				}
				icon={ShieldCheck}
				metadata={binding.metadata}
				badges={<StatusBadge enabled={enabled} />}
			>
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => undefined}
					showToggle={false}
					onDelete={() =>
						del.request({
							id: binding.metadata.id ?? "",
							name: binding.metadata.name,
							label: displayLabel(binding.metadata),
						})
					}
					editLink={({ className, content }) => (
						<Link
							to="/policy-bindings/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</DetailPageHeader>

			<div className="flex flex-col gap-5">
				<PlanIssuesPanel kind="policybinding" id={binding.metadata.id} />

				<DetailCard title="Configuration" icon={ShieldCheck}>
					<dl className="divide-y divide-border">
						<DetailRow label="Owner">
							<BindingOwner binding={binding} />
						</DetailRow>
						<DetailRow label="Policy">
							{policy ? (
								<Link
									to="/policies/$name"
									params={{ name: policy.metadata.name }}
									className="text-foreground hover:underline"
								>
									{displayLabel(policy.metadata)}
								</Link>
							) : (
								<code className="font-mono text-[11px]">
									{binding.spec.policyId}
								</code>
							)}
						</DetailRow>
						{labels.length > 0 && (
							<DetailRow label="Labels">
								<div className="flex flex-wrap gap-1.5">
									{labels.map(([k, v]) => (
										<Chip key={k} label={`${k}=${v}`} mono />
									))}
								</div>
							</DetailRow>
						)}
					</dl>
				</DetailCard>

				<DetailCard title="Accounts" icon={Building2}>
					{accountIds.length === 0 ? (
						<DetailEmpty>This binding holds no accounts.</DetailEmpty>
					) : (
						<AccountChips accountIds={accountIds} />
					)}
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
