import { subjectKey } from "@/api/hooks/policyBindings";
import type { PolicyBindingSubject } from "@/api/types/policyBinding";
import { SUBJECT_KIND_LABEL } from "@/policy-bindings/subjects";
import { Chip } from "@/shared/Chip";

/** A binding's subjects as "Kind · name" chips; any kind the server sends renders. */
export function SubjectChips({
	subjects,
	subjectName,
}: {
	subjects: readonly PolicyBindingSubject[];
	subjectName: (subject: PolicyBindingSubject) => string;
}) {
	return (
		<div className="flex flex-wrap gap-1">
			{subjects.map((s) => (
				<Chip
					key={subjectKey(s)}
					label={`${SUBJECT_KIND_LABEL[s.kind]} · ${subjectName(s)}`}
					shape="box"
				/>
			))}
		</div>
	);
}
