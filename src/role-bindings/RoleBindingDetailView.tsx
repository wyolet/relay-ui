import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Globe, ShieldCheck, Users } from "lucide-react";
import { useDeleteRoleBinding, useRoleBinding } from "@/api/hooks/roleBindings";
import { useRoles } from "@/api/hooks/roles";
import { displayLabel } from "@/lib/displayLabel";
import { OwnerLink } from "@/projects/OwnerLink";
import { subjectLabel } from "@/role-bindings/SubjectsEditor";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function RoleBindingDetailView({ name }: { name: string }) {
	const { data: binding } = useRoleBinding(name);
	const { data: rolesData } = useRoles();
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeleteRoleBinding(), {
		noun: "role binding",
		onDeleted: () =>
			void navigate({ to: "/users", search: { tab: "role-bindings" } }),
	});

	const enabled = binding.spec.enabled !== false;
	const labels = Object.entries(binding.metadata.labels ?? {});
	const subjects = binding.spec.subjects ?? [];
	const role = (rolesData.items ?? []).find(
		(r) => r.metadata.id === binding.spec.roleId,
	);

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/users"
				search={{ tab: "role-bindings" }}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Role bindings
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
					onDelete={() =>
						del.request({
							id: binding.metadata.id ?? "",
							name: binding.metadata.name,
							label: displayLabel(binding.metadata),
						})
					}
					editLink={({ className, content }) => (
						<Link
							to="/role-bindings/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</DetailPageHeader>

			<DetailCard title="Configuration" icon={Globe}>
				<dl className="divide-y divide-border">
					<DetailRow label="Role">
						{role ? (
							<Link
								to="/roles/$name"
								params={{ name: role.metadata.name }}
								className="text-foreground hover:underline"
							>
								{displayLabel(role.metadata)}
							</Link>
						) : (
							<code className="font-mono text-[11px]">
								{binding.spec.roleId}
							</code>
						)}
					</DetailRow>
					<DetailRow label="Scope">
						{binding.spec.scope.kind === "system" ? (
							<span className="text-muted-foreground">
								Global — grants everywhere
							</span>
						) : (
							<OwnerLink owner={binding.spec.scope} />
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
					<div className="flex flex-wrap gap-1.5">
						{subjects.map((s) => (
							<Chip
								key={subjectLabel(s)}
								label={subjectLabel(s)}
								mono
								shape="box"
							/>
						))}
					</div>
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
