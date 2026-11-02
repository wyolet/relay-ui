import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/api/auth";
import type { PolicyBindingSubject } from "@/api/types/policyBinding";
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
import {
	isOfferedKind,
	newSubjectRow,
	OFFERED_SUBJECT_KINDS,
	type OfferedSubjectKind,
	SUBJECT_KIND_LABEL,
	type SubjectRow,
	subjectRowKey,
	toOfferedKind,
} from "@/policy-bindings/subjects";
import type { SubjectOption } from "@/policy-bindings/useSubjectOptions";
import { Chip } from "@/shared/Chip";

const KIND_OPTIONS = OFFERED_SUBJECT_KINDS.map((k) => ({
	value: k,
	label: SUBJECT_KIND_LABEL[k],
}));

/**
 * Subject rows of a policy binding. Kinds the form no longer offers (host,
 * credential) stay as fixed chips so a save keeps them.
 */
export function SubjectsEditor({
	rows,
	onChange,
	options,
	subjectName,
	invalidKey,
	describedBy,
}: {
	rows: SubjectRow[];
	onChange: (next: SubjectRow[]) => void;
	options: Record<OfferedSubjectKind, SubjectOption[]>;
	subjectName: (subject: PolicyBindingSubject) => string;
	/** "<kind>:<id>" of a row the server refused. */
	invalidKey?: string;
	describedBy?: string;
}) {
	const { userId } = useAuth();

	function patch(rowId: string, next: Partial<SubjectRow>) {
		onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...next } : r)));
	}
	function remove(rowId: string) {
		onChange(rows.filter((r) => r.rowId !== rowId));
	}

	return (
		<div className="flex flex-col gap-2 max-w-2xl">
			{rows.map((r) => {
				const invalid =
					invalidKey !== undefined && subjectRowKey(r) === invalidKey;
				if (!isOfferedKind(r.kind)) {
					return (
						<div key={r.rowId} className="flex items-center gap-2">
							<Chip
								label={`${SUBJECT_KIND_LABEL[r.kind]} · ${subjectName({ kind: r.kind, id: r.value })}`}
								shape="box"
								onRemove={() => remove(r.rowId)}
							/>
						</div>
					);
				}
				const valueOptions = options[r.kind];
				return (
					<div key={r.rowId} className="flex items-center gap-2">
						<Select
							value={r.kind}
							items={KIND_OPTIONS}
							onValueChange={(v) =>
								patch(r.rowId, { kind: toOfferedKind(v) ?? r.kind, value: "" })
							}
						>
							<SelectTrigger
								className="w-44 shrink-0"
								aria-label="Subject kind"
							>
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

						{valueOptions.length > 0 ? (
							<Select
								value={r.value}
								items={valueOptions}
								onValueChange={(v) => patch(r.rowId, { value: v ?? "" })}
							>
								<SelectTrigger
									className="w-full"
									aria-label={SUBJECT_KIND_LABEL[r.kind]}
									aria-invalid={invalid ? true : undefined}
									aria-describedby={invalid ? describedBy : undefined}
								>
									<SelectValue placeholder="Pick a subject…" />
								</SelectTrigger>
								<SelectContent>
									{valueOptions.map((o) => (
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
								onChange={(e) =>
									patch(r.rowId, { value: e.currentTarget.value })
								}
								placeholder={`${SUBJECT_KIND_LABEL[r.kind]} id`}
								aria-label={`${SUBJECT_KIND_LABEL[r.kind]} id`}
								aria-invalid={invalid ? true : undefined}
								aria-describedby={invalid ? describedBy : undefined}
							/>
						)}

						{r.kind === "user" && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!userId}
								onClick={() => userId && patch(r.rowId, { value: userId })}
							>
								Me
							</Button>
						)}

						<IconButton
							icon={Trash2}
							weight="bare"
							size="sm"
							label="Remove subject"
							onClick={() => remove(r.rowId)}
						/>
					</div>
				);
			})}
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
