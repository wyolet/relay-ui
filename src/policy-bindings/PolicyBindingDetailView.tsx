import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { usePolicies } from "@/api/hooks/policies";
import {
	useDeletePolicyBinding,
	usePolicyBinding,
} from "@/api/hooks/policyBindings";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import { BindingOwner } from "@/policy-bindings/BindingOwner";
import { SubjectChips } from "@/policy-bindings/SubjectChips";
import { useSubjectOptions } from "@/policy-bindings/useSubjectOptions";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";
import { toast } from "@/shared/Toast";

export function PolicyBindingDetailView({ name }: { name: string }) {
	const { data: binding } = usePolicyBinding(name);
	const { data: policiesData } = usePolicies();
	const { subjectName } = useSubjectOptions();
	const deleteBinding = useDeletePolicyBinding();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);

	const enabled = binding.spec.enabled !== false;
	const labels = Object.entries(binding.metadata.labels ?? {});
	const subjects = binding.spec.subjects ?? [];
	const policy = (policiesData.items ?? []).find(
		(p) => p.metadata.id === binding.spec.policyId,
	);

	async function handleDelete() {
		try {
			await deleteBinding.mutateAsync(binding.metadata.id ?? "");
			toast(
				"success",
				`Policy binding "${displayLabel(binding.metadata)}" deleted.`,
			);
			void navigate({ to: "/policy-bindings" });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete policy binding.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/policy-bindings"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Policy bindings
			</Link>

			<DetailPageHeader
				icon={ShieldCheck}
				metadata={binding.metadata}
				badges={<StatusBadge enabled={enabled} />}
			>
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => undefined}
					showToggle={false}
					onDelete={() => setConfirming(true)}
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

			{confirming && (
				<DeleteConfirm
					resourceName={binding.metadata.name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteBinding.isPending}
				/>
			)}
		</div>
	);
}
