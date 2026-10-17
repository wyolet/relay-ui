import { ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { AccessCheckDialog } from "@/access-review/AccessCheckDialog";
import { useCanCheckOthersAccess } from "@/access-review/useCanCheckOthersAccess";
import type { AccessReviewSubject } from "@/api/hooks/accessReview";
import { Button } from "@/components/ui/button";

/** Detail-page entry to the access check for another subject; renders nothing
 * for a non-admin or a relay that cannot answer reviews. */
export function CheckAccessButton({
	subject,
	subjectLabel,
	size,
}: {
	subject: AccessReviewSubject;
	subjectLabel: string;
	size?: "default" | "lg";
}) {
	const canCheck = useCanCheckOthersAccess();
	const [open, setOpen] = useState(false);
	if (!canCheck) return null;

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size={size}
				onClick={() => setOpen(true)}
			>
				<ShieldQuestion className="size-3.5" />
				Check access
			</Button>
			{open && (
				<AccessCheckDialog
					subject={subject}
					subjectLabel={subjectLabel}
					onClose={() => setOpen(false)}
				/>
			)}
		</>
	);
}
