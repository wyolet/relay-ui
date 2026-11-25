import { MessagesBanner } from "@/shared/MessagesBanner";

/** The plan issues relay would refuse a one-request write for. */
export function RefusedIssues({
	messages,
}: {
	messages: readonly string[] | undefined;
}) {
	return (
		<MessagesBanner
			severity="error"
			title="Relay would refuse this setup"
			messages={messages}
			role="alert"
		/>
	);
}
