import { useQuery } from "@tanstack/react-query";
import {
	type GovernanceSection,
	governanceQueryOptions,
	useUpdateGovernance,
} from "@/api/hooks/governance";
import {
	governanceToLevel,
	levelToGovernance,
	type PermissionLevel,
} from "@/lib/ownership";
import { useSettingSave } from "@/settings/useSettingSave";

export const GOVERNANCE_ROWS: {
	section: GovernanceSection;
	label: string;
	hint: string;
}[] = [
	{
		section: "policy",
		label: "Host-owned policies",
		hint: "Policies a host created and manages.",
	},
	{
		section: "model",
		label: "Synced models",
		hint: "Local changes may be overwritten on the next sync.",
	},
	{
		section: "provider",
		label: "Synced providers",
		hint: "Local changes may be overwritten on the next sync.",
	},
	{
		section: "host",
		label: "Synced hosts",
		hint: "Local changes may be overwritten on the next sync.",
	},
];

const LEVEL_TEXT: Record<PermissionLevel, string> = {
	off: "Read-only",
	write: "Editing allowed",
	delete: "Editing and deleting allowed",
};

/** How far operators may change one catalog-managed kind, and its setter. */
export function useGovernanceLevel(section: GovernanceSection, label: string) {
	const gov = useQuery(governanceQueryOptions(section));
	const save = useSettingSave(
		useUpdateGovernance(section),
		"Failed to update permissions.",
	);
	const level = gov.data ? governanceToLevel(gov.data.value) : undefined;
	return {
		level,
		text: level ? LEVEL_TEXT[level] : undefined,
		setLevel: (next: PermissionLevel) =>
			save.save(
				levelToGovernance(next),
				`${label}: ${LEVEL_TEXT[next]}`,
				section,
			),
		pending: save.pending,
	};
}
