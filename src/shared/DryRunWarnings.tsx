import { MessagesBanner } from "@/shared/MessagesBanner";

/** What a dry run says relay accepts but warns about; the submit stays open. */
export function DryRunWarnings({
	messages,
}: {
	messages: readonly string[] | undefined;
}) {
	return (
		<MessagesBanner
			severity="warn"
			title="Relay will accept this, with warnings"
			messages={messages}
			role="status"
		/>
	);
}
