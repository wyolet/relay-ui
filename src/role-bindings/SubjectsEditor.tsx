import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/api/auth";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import type { RoleBindingSubject } from "@/api/types/roleBinding";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";

// Subjects are shaped the same for role and policy bindings — the server shares
// one Subject type between them, so the editor is shared here too.

export type SubjectKind = "user" | "group" | "serviceaccount";

/** `id` keys the rows while the identifier is still being typed. */
export interface SubjectRow {
	id: string;
	kind: SubjectKind;
	/** Subject id for user/serviceaccount, group name for group. */
	value: string;
}

const KIND_OPTIONS: { value: SubjectKind; label: string }[] = [
	{ value: "user", label: "User" },
	{ value: "group", label: "Group" },
	{ value: "serviceaccount", label: "Service account" },
];

export function newSubjectRow(
	kind: SubjectKind = "group",
	value = "",
): SubjectRow {
	return { id: crypto.randomUUID(), kind, value };
}

export function toSubjectRows(
	subjects: RoleBindingSubject[] | null | undefined,
): SubjectRow[] {
	return (subjects ?? []).map((s) =>
		newSubjectRow(
			(s.kind as SubjectKind) ?? "group",
			s.kind === "group" ? (s.name ?? "") : (s.id ?? ""),
		),
	);
}

/** A group subject carries a name, every other kind carries an id — the
 * server rejects a subject that carries both or neither. */
export function fromSubjectRows(rows: SubjectRow[]): RoleBindingSubject[] {
	return rows
		.filter((r) => r.value.trim().length > 0)
		.map((r) =>
			r.kind === "group"
				? { kind: r.kind, name: r.value.trim() }
				: { kind: r.kind, id: r.value.trim() },
		);
}

/** Renders a stored subject the way the server keys it. */
export function subjectLabel(s: RoleBindingSubject): string {
	return `${s.kind}:${s.name ?? s.id ?? ""}`;
}

export function SubjectsEditor({
	rows,
	onChange,
}: {
	rows: SubjectRow[];
	onChange: (next: SubjectRow[]) => void;
}) {
	const { userId } = useAuth();
	const { data: accounts } = useQuery(serviceAccountsListQueryOptions);
	const accountOptions = (accounts?.items ?? []).map((sa) => ({
		value: sa.metadata.id ?? "",
		label: displayLabel(sa.metadata),
	}));

	function patch(id: string, next: Partial<SubjectRow>) {
		onChange(rows.map((r) => (r.id === id ? { ...r, ...next } : r)));
	}

	return (
		<div className="flex flex-col gap-2 max-w-2xl">
			{rows.map((r) => (
				<div key={r.id} className="flex items-center gap-2">
					<Select
						value={r.kind}
						items={KIND_OPTIONS}
						onValueChange={(v) =>
							patch(r.id, { kind: (v as SubjectKind) ?? "group", value: "" })
						}
					>
						<SelectTrigger className="w-44 shrink-0">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{KIND_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{r.kind === "serviceaccount" ? (
						<Select
							value={r.value}
							items={accountOptions}
							onValueChange={(v) => patch(r.id, { value: v ?? "" })}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Pick a service account…" />
							</SelectTrigger>
							<SelectContent>
								{accountOptions.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<Input
							type="text"
							value={r.value}
							onChange={(e) => patch(r.id, { value: e.currentTarget.value })}
							placeholder={
								r.kind === "group" ? "platform-eng" : "user id (UUID)"
							}
							aria-label={r.kind === "group" ? "Group name" : "User id"}
						/>
					)}

					{r.kind === "user" && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!userId}
							onClick={() => userId && patch(r.id, { value: userId })}
						>
							Me
						</Button>
					)}

					<IconButton
						icon={Trash2}
						weight="bare"
						size="sm"
						label="Remove subject"
						onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
					/>
				</div>
			))}
			<div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onChange([...rows, newSubjectRow()])}
				>
					<Plus className="w-3.5 h-3.5" />
					Add subject
				</Button>
			</div>
		</div>
	);
}
