import { Eraser } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { EraseBodiesDialog } from "./EraseBodiesDialog";
import type { EraseSelection } from "./eraseScope";

/** Opens the erase dialog; renders nothing for non-admins, whom relay refuses. */
export function EraseBodiesButton({ scope }: { scope?: EraseSelection }) {
	const { isAdmin } = useAuth();
	const [open, setOpen] = useState(false);
	if (!isAdmin) return null;
	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="lg"
				onClick={() => setOpen(true)}
			>
				<Eraser className="size-3.5" />
				Erase bodies
			</Button>
			{open && (
				<EraseBodiesDialog scope={scope} onClose={() => setOpen(false)} />
			)}
		</>
	);
}
