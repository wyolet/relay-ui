import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { useUsers } from "@/api/hooks/users";
import { Chip } from "@/shared/Chip";
import { SearchBox } from "@/shared/SearchBox";
import { StatusBadge } from "@/shared/StatusBadge";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";

/**
 * The account list. Users come from the bootstrap YAML or the identity
 * provider, so there is nothing to create or edit here — the table is a way
 * into one account's access.
 */
export function UsersTable() {
	const { data: users } = useUsers();
	const [needle, setNeedle] = useState("");

	// The endpoint takes no filters; it returns the whole (small) account list,
	// so the search box refines what was already fetched.
	const q = needle.trim().toLowerCase();
	const shown = q
		? users.filter((u) =>
				[u.username, u.email, u.id].some((v) => v?.toLowerCase().includes(q)),
			)
		: users;

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox
						value={needle}
						onChange={setNeedle}
						placeholder="Search users"
						aria-label="Search users"
					/>
				}
			/>

			{users.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<UserRound className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" />
					<p className="mb-1 text-sm font-medium text-foreground">No users</p>
					<p className="mx-auto max-w-sm text-sm text-muted-foreground">
						Accounts come from the bootstrap YAML or your identity provider.
					</p>
				</div>
			) : shown.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<p className="text-sm text-muted-foreground">
						No users match this search.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Username</Th>
								<Th variant="column">Email</Th>
								<Th variant="column">Roles</Th>
								<Th variant="column">Status</Th>
							</tr>
						</thead>
						<tbody>
							{shown.map((u) => (
								<tr
									key={u.id}
									className="border-t border-border transition-colors hover:bg-muted/40"
								>
									<td className="px-3 py-2">
										<Link
											to="/users/$id"
											params={{ id: u.id }}
											className="text-sm font-medium text-foreground hover:underline"
										>
											{u.username}
										</Link>
										<div className="font-mono text-[11px] text-muted-foreground">
											{u.id}
										</div>
									</td>
									<td className="px-3 py-2 text-xs text-muted-foreground">
										{u.email || "—"}
									</td>
									<td className="px-3 py-2">
										<div className="flex flex-wrap gap-1">
											{(u.roles ?? []).length === 0 ? (
												<span className="text-xs text-muted-foreground">—</span>
											) : (
												(u.roles ?? []).map((r) => (
													<Chip key={r} label={r} mono shape="box" />
												))
											)}
										</div>
									</td>
									<td className="px-3 py-2">
										<StatusBadge enabled={!u.disabled} enabledLabel="Active" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
