import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Users } from "lucide-react";
import { useState } from "react";
import { useDeleteGroup, useGroup } from "@/api/hooks/groups";
import { ApiError } from "@/api/types/errors";
import { useToggleGroupEnabled } from "@/groups/useToggleGroupEnabled";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { StatusBadge } from "@/shared/StatusBadge";
import { toast } from "@/shared/Toast";

export function GroupDetailView({ name }: { name: string }) {
	const { data: g } = useGroup(name);
	const deleteGroup = useDeleteGroup();
	const { setEnabled, isPending: isToggling } = useToggleGroupEnabled();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);

	const enabled = g.spec.enabled !== false;
	const members = g.spec.memberIds ?? [];
	const description = g.metadata.description?.trim();

	async function handleDelete() {
		try {
			await deleteGroup.mutateAsync(g.metadata.id ?? "");
			toast("success", `Group "${displayLabel(g.metadata)}" deleted.`);
			void navigate({ to: "/groups" });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete group.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/groups"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Groups
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<Users className="w-4 h-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(g.metadata)}
							{!hasDisplayName(g.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							<StatusBadge enabled={enabled} />
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{g.metadata.name}
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
					onToggle={() => void setEnabled(g, !enabled)}
					toggling={isToggling}
					onDelete={() => setConfirming(true)}
					editLink={({ className, content }) => (
						<Link
							to="/groups/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</header>

			<section className="rounded-md border border-border bg-card">
				<header className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
					<Users className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
					<h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						Members
					</h2>
					<span className="text-[11px] text-muted-foreground tabular-nums">
						{members.length}
					</span>
				</header>
				<div className="px-4 py-3">
					{members.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							No members. Bindings naming this group match nobody.
						</p>
					) : (
						<ul className="divide-y divide-border">
							{members.map((id) => (
								<li
									key={id}
									className="py-2 first:pt-0 last:pb-0 font-mono text-[11px] text-foreground"
								>
									{id}
								</li>
							))}
						</ul>
					)}
				</div>
			</section>

			{confirming && (
				<DeleteConfirm
					resourceName={g.metadata.name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteGroup.isPending}
				/>
			)}
		</div>
	);
}
