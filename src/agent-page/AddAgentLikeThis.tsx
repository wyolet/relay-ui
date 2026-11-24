import { useAgentCopy } from "@/agent-page/useAgentCopy";
import { AddAgent } from "@/agents/AddAgent";

/** The Add agent form, started from the setup of service account `from`. */
export function AddAgentLikeThis({
	from,
	onCancel,
}: {
	from: string;
	onCancel: () => void;
}) {
	const initial = useAgentCopy(from);
	return <AddAgent initial={initial} onCancel={onCancel} />;
}
