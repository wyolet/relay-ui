import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Link2, ShieldCheck } from "lucide-react";
import {
	FEATURE_CUSTOM_ROLES,
	useHasLicenseFeature,
} from "@/api/hooks/license";
import { useDeleteRole, useRole, useRoleReferences } from "@/api/hooks/roles";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { CustomRolesNotice } from "@/roles/CustomRolesNotice";
import { RuleChips } from "@/roles/RuleChips";
import { isBuiltinRole } from "@/roles/vocabulary";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailEmpty } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function RoleDetailView({ name }: { name: string }) {
	const { data: role } = useRole(name);
	const { data: refs } = useRoleReferences(role.metadata.id);
	const canAuthor = useHasLicenseFeature(FEATURE_CUSTOM_ROLES);
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeleteRole(), {
		noun: "role",
		onDeleted: () => void navigate({ to: "/roles" }),
	});

	const builtin = isBuiltinRole(role.metadata.owner?.kind);
	const editable = !builtin && canAuthor;
	const enabled = role.spec.enabled !== false;
	const description = role.metadata.description?.trim();
	const labels = Object.entries(role.metadata.labels ?? {});
	const rules = role.spec.rules ?? [];

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/roles"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Roles
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
							{displayLabel(role.metadata)}
							{!hasDisplayName(role.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							{builtin && <Chip label="built-in" shape="box" />}
							<StatusBadge enabled={enabled} />
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{role.metadata.name}
						</p>
						{description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</div>
				</div>
				{editable && (
					<DetailHeaderActions
						enabled={enabled}
						onToggle={() => undefined}
						showToggle={false}
						onDelete={() =>
							del.request({
								id: role.metadata.id ?? "",
								name: role.metadata.name,
								label: displayLabel(role.metadata),
							})
						}
						editLink={({ className, content }) => (
							<Link
								to="/roles/$name/edit"
								params={{ name }}
								className={className}
							>
								{content}
							</Link>
						)}
					/>
				)}
			</header>

			{builtin && (
				<p className="text-[11px] text-muted-foreground">
					Built-in roles are seeded on every deployment and are read-only.
				</p>
			)}
			{!builtin && !canAuthor && <CustomRolesNotice />}

			<DetailCard title="Rules" icon={ShieldCheck}>
				{rules.length === 0 ? (
					<DetailEmpty>This role grants nothing.</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{rules.map((rule) => (
							<li
								key={`${(rule.kinds ?? []).join(",")}|${(rule.verbs ?? []).join(",")}`}
								className="py-2.5 first:pt-0 last:pb-0"
							>
								<RuleChips rule={rule} />
							</li>
						))}
					</ul>
				)}
			</DetailCard>

			{labels.length > 0 && (
				<DetailCard title="Labels" icon={ShieldCheck}>
					<div className="flex flex-wrap gap-1.5">
						{labels.map(([k, v]) => (
							<Chip key={k} label={`${k}=${v}`} mono />
						))}
					</div>
				</DetailCard>
			)}

			<DetailCard title="References" icon={Link2}>
				{(refs.items ?? []).length === 0 ? (
					<DetailEmpty>No binding names this role yet.</DetailEmpty>
				) : (
					<ul className="divide-y divide-border">
						{(refs.items ?? []).map((r) => (
							<li
								key={`${r.kind}:${r.id}`}
								className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-xs"
							>
								<span className="text-foreground">{r.name}</span>
								<span className="text-muted-foreground">
									{r.kind} · <code className="font-mono">{r.via}</code>
								</span>
							</li>
						))}
					</ul>
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
