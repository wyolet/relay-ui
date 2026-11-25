/** Labels the Add agent form writes; list endpoints filter on them with `?label=key=value`. */
export const SA_TYPE_LABEL = "sa-type";
export const AGENT_SA_TYPE = "agent";
export const AGENT_LABEL_SELECTOR = "sa-type=agent";
/** On the pools and the policy made for one agent: that service account's id. */
export const AGENT_ID_LABEL = "agent-id";

/** On the pools the Access form makes for one team, project or service account: that row's account id. */
export const ACCESS_FOR_LABEL = "access-for";

export function agentLabels(): Record<string, string> {
	return { [SA_TYPE_LABEL]: AGENT_SA_TYPE };
}

export function agentRowLabels(
	serviceAccountId: string,
): Record<string, string> {
	return { [AGENT_ID_LABEL]: serviceAccountId };
}

export function accessRowLabels(accountId: string): Record<string, string> {
	return { [ACCESS_FOR_LABEL]: accountId };
}
