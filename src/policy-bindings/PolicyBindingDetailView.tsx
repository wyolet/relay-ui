import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ShieldCheck, Users } from "lucide-react";
import { usePolicies } from "@/api/hooks/policies";
import {
	useDeletePolicyBinding,
	usePolicyBinding,
} from "@/api/hooks/policyBindings";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { BindingOwner } from "@/policy-bindings/BindingOwner";
import { SubjectChips } from "@/policy-bindings/SubjectChips";
import { useSubjectOptions } from "@/policy-bindings/useSubjectOptions";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function PolicyBindingDetailView({ name }: { name: string }) {
	const { data: binding } = usePolicyBinding(name);
	const { data: policiesData } = usePolicies();
	const { subjectName } = useSubjectOptions();
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeletePolicyBinding(), {
		noun: "policy binding",
		onDeleted: () => void navigate({ to: "/policy-bindings" }),
	});

	const enabled = binding.spec.enabled !== false;
	const description = binding.metadata.description?.trim();
	const labels = Object.entries(binding.metadata.labels ?? {});
	const subjects = binding.spec.subjects ?? [];
	const policy = (policiesData.items ?? []).find(
		(p) => p.metadata.id === binding.spec.policyId,
	);

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/policy-bindings"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Policy bindings
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<ShieldCheck
							className="w-4 h-4 text-muted-foreground"
							aria-hidden
						/>
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(binding.metadata)}
							{!hasDisplayName(binding.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							<StatusBadge enabled={enabled} />
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{binding.metadata.name}
						</p>
						{description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</div>
				</div>
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
			</header>

			<DetailCard title="Configuration" icon={ShieldCheck}>
				<dl className="divide-y divide-border">
					<DetailRow label="Owner">
						<BindingOwner binding={binding} subjectName={subjectName} />
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

			<DetailCard title="Subjects" icon={Users}>
				{subjects.length === 0 ? (
					<DetailEmpty>This binding names no subjects.</DetailEmpty>
				) : (
					<SubjectChips subjects={subjects} subjectName={subjectName} />
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
	);
}
