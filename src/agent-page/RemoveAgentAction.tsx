import { BotOff } from "lucide-react";
import { useState } from "react";
import { RemoveAgentDialog } from "@/agent-page/RemoveAgentDialog";
import { isAgent } from "@/agent-page/removalPlan";
import { Button } from "@/components/ui/button";
import type { ShortcutTarget } from "@/shortcuts/registry";

export function RemoveAgentAction({ target }: { target: ShortcutTarget }) {
	const [open, setOpen] = useState(false);
	if (!isAgent(target.labels)) return null;
	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="lg"
				className="text-destructive hover:text-destructive"
				onClick={() => setOpen(true)}
			>
				<BotOff data-icon="inline-start" className="size-3.5" />
				Remove agent
			</Button>
			{open && (
				<RemoveAgentDialog target={target} onClose={() => setOpen(false)} />
			)}
		</>
	);
}
