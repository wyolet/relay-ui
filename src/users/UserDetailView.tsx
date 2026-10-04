import { Link } from "@tanstack/react-router";
import {
	ChevronLeft,
	KeySquare,
	ShieldOff,
	UserRound,
	UsersRound,
} from "lucide-react";
import { useGroups } from "@/api/hooks/groups";
import { useRoleBindingsList } from "@/api/hooks/roleBindings";
import { useRevokeUserTokens, useUser } from "@/api/hooks/users";
import { ApiError } from "@/api/types/errors";
import { Button } from "@/components/ui/button";
import { displayLabel } from "@/lib/displayLabel";
import { OwnerLink } from "@/projects/OwnerLink";
import { Chip } from "@/shared/Chip";
import { confirm } from "@/shared/ConfirmDialog";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";
import { StatusBadge } from "@/shared/StatusBadge";
import { toast } from "@/shared/Toast";

export function UserDetailView({ id }: { id: string }) {
	const user = useUser(id);
	const revokeTokens = useRevokeUserTokens();

	if (!user) {
		return (
			<div className="flex flex-col gap-5">
				<BackLink />
				<p className="text-sm text-muted-foreground">
					No account with id <code className="font-mono text-xs">{id}</code>.
				</p>
			</div>
		);
	}

	async function handleRevoke() {
		const ok = await confirm({
			title: `Revoke every token for ${user?.username}?`,
			description:
				"Every inference token this user holds stops verifying immediately. They can mint a new one; nothing else about the account changes.",
			confirmLabel: "Revoke tokens",
			danger: true,
		});
		if (!ok) return;
		try {
			await revokeTokens.mutateAsync(id);
			toast("success", "Tokens revoked.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to revoke tokens.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<BackLink />

			<header className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-start gap-3">
					<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
						<UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="flex items-center gap-2 truncate text-xl font-semibold text-foreground">
							{user.username}
							<StatusBadge enabled={!user.disabled} enabledLabel="Active" />
						</h1>
						<p className="mt-1 truncate font-mono text-xs text-muted-foreground">
							{user.id}
						</p>
					</div>
				</div>
				<Button
					type="button"
					variant="outline"
					onClick={() => void handleRevoke()}
					disabled={revokeTokens.isPending}
				>
					<ShieldOff className="h-3.5 w-3.5" />
					{revokeTokens.isPending ? "Revoking…" : "Revoke all tokens"}
				</Button>
			</header>

			<DetailCard title="Account" icon={UserRound}>
				<dl className="divide-y divide-border">
					<DetailRow label="Email">{user.email || "—"}</DetailRow>
					<DetailRow label="Roles">
						{(user.roles ?? []).length === 0 ? (
							<span className="text-muted-foreground">
								None — access comes from role bindings.
							</span>
						) : (
							<div className="flex flex-wrap gap-1">
								{(user.roles ?? []).map((r) => (
									<Chip key={r} label={r} mono shape="box" />
								))}
							</div>
						)}
					</DetailRow>
				</dl>
			</DetailCard>

			<UserRoleBindings id={id} />
			<UserGroups id={id} />
		</div>
	);
}

function BackLink() {
	return (
		<Link
			to="/users"
			className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
		>
			<ChevronLeft className="h-3.5 w-3.5" />
			Users
		</Link>
	);
}

/** The bindings that name this user directly. Bindings reaching them through a
 * group are listed under Groups instead — the server matches subjects verbatim. */
function UserRoleBindings({ id }: { id: string }) {
	const { data } = useRoleBindingsList({ subject: [`user:${id}`] });
	const items = data.items ?? [];
	return (
		<DetailCard title="Role bindings" icon={KeySquare}>
			{items.length === 0 ? (
				<DetailEmpty>
					No binding names this user directly. They may still inherit access
					through a group.
				</DetailEmpty>
			) : (
				<ul className="divide-y divide-border">
					{items.map((b) => (
						<li
							key={b.metadata.name}
							className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
						>
							<Link
								to="/role-bindings/$name"
								params={{ name: b.metadata.name }}
								className="min-w-0 truncate text-xs text-foreground hover:underline"
							>
								{displayLabel(b.metadata)}
							</Link>
							{b.spec.scope.kind === "system" ? (
								<span className="text-[11px] text-muted-foreground">
									Global
								</span>
							) : (
								<OwnerLink owner={b.spec.scope} />
							)}
						</li>
					))}
				</ul>
			)}
		</DetailCard>
	);
}

/** Groups holding this user. Membership lives on the group's `memberIds`, and
 * /groups takes no member filter, so the match is made here over the list. */
function UserGroups({ id }: { id: string }) {
	const { data } = useGroups();
	const groups = (data.items ?? []).filter((g) =>
		(g.spec.memberIds ?? []).includes(id),
	);
	return (
		<DetailCard title="Groups" icon={UsersRound}>
			{groups.length === 0 ? (
				<DetailEmpty>This user is in no group.</DetailEmpty>
			) : (
				<ul className="divide-y divide-border">
					{groups.map((g) => (
						<li key={g.metadata.name} className="py-2 first:pt-0 last:pb-0">
							<Link
								to="/groups/$name"
								params={{ name: g.metadata.name }}
								className="text-xs text-foreground hover:underline"
							>
								{displayLabel(g.metadata)}
							</Link>
						</li>
					))}
				</ul>
			)}
		</DetailCard>
	);
}
