import type { RoleBindingSubject } from "@/api/types/roleBinding";
import { subjectLabel } from "@/role-bindings/SubjectsEditor";
import { subjectDisplay } from "@/role-bindings/subjectDirectory";
import { useSubjectDirectory } from "@/role-bindings/useSubjectDirectory";
import { Chip } from "@/shared/Chip";

/** A binding's subjects as chips: the kind muted beside the name. */
export function SubjectChips({
	subjects,
}: {
	subjects: readonly RoleBindingSubject[];
}) {
	const directory = useSubjectDirectory();
	return (
		<div className="flex flex-wrap gap-1.5">
			{subjects.map((s) => {
				const shown = subjectDisplay(s, directory);
				return (
					<Chip
						key={subjectLabel(s)}
						shape="box"
						label={
							<>
								<span className="text-muted-foreground">{shown.kind}</span>{" "}
								<span className={shown.known ? undefined : "font-mono"}>
									{shown.label}
								</span>
							</>
						}
					/>
				);
			})}
		</div>
	);
}
