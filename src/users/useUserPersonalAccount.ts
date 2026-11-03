import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { useGroups } from "@/api/hooks/groups";
import {
	invalidatePersonalAccountReads,
	type UserRow,
	useUpdateUserPersonalAccount,
} from "@/api/hooks/users";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import {
	type PersonalAccountChoice,
	personalAccountEffectiveText,
	shownEffective,
	toPersonalAccountChoice,
	userPersonalAccountInput,
} from "@/lib/personalAccount";
import { toast } from "@/shared/Toast";

/** The user's effective personal-account state with its deciding group, and the admin's switch for it. */
export function useUserPersonalAccount(user: UserRow) {
	const { isAdmin } = useAuth();
	const { data: groupsData } = useGroups();
	const update = useUpdateUserPersonalAccount();

	const queryClient = useQueryClient();
	// The pick shows while the save and its re-read are in flight.
	const pending = update.isPending ? update.variables : undefined;
	const own = pending ? pending.personalAccount : user.personalAccount;
	const effective = shownEffective(
		own || undefined,
		user.personalAccountEffective,
	);
	const groupId = effective?.source === "group" ? effective.groupId : undefined;
	const group = groupId
		? (groupsData.items ?? []).find((g) => g.metadata.id === groupId)
		: undefined;

	async function setChoice(choice: PersonalAccountChoice) {
		try {
			await update.mutateAsync({
				id: user.id,
				personalAccount: userPersonalAccountInput(choice),
			});
			toast("success", `Personal account updated for ${user.username}.`);
			// Relay rebuilds its plans just after the write; read the result once more.
			setTimeout(() => void invalidatePersonalAccountReads(queryClient), 1_500);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update the personal account.",
			);
		}
	}

	return {
		effectiveText: effective
			? personalAccountEffectiveText(effective)
			: undefined,
		sourceGroup: groupId
			? {
					ref: group?.metadata.name ?? groupId,
					label: group ? displayLabel(group.metadata) : groupId,
				}
			: undefined,
		choice: toPersonalAccountChoice(own),
		canEdit: isAdmin,
		setChoice,
	};
}
