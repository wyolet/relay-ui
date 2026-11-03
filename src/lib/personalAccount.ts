import { ApiError } from "@/api/types/errors";
import type { components } from "@/api/types.gen";

/** What applies to a user's personal account, and what decided it. */
export type PersonalAccountEffective =
	components["schemas"]["PersonalAccountEffective"];

/** A user's or group's own say; undefined leaves it to the next level. */
export type PersonalAccountValue =
	components["schemas"]["GroupSpec"]["personalAccount"];

export const PERSONAL_ACCOUNT_CHOICES = ["inherit", "on", "off"] as const;
export type PersonalAccountChoice = (typeof PERSONAL_ACCOUNT_CHOICES)[number];

const CHOICE_LABELS: Record<PersonalAccountChoice, string> = {
	inherit: "Inherit",
	on: "On",
	off: "Off",
};

export const PERSONAL_ACCOUNT_CHOICE_OPTIONS = PERSONAL_ACCOUNT_CHOICES.map(
	(value) => ({ value, label: CHOICE_LABELS[value] }),
);

/** A stored value or a user-update input as a choice; unset and "" both inherit. */
export function toPersonalAccountChoice(
	value: PersonalAccountValue | "",
): PersonalAccountChoice {
	return value || "inherit";
}

/** The spec field a group write sends; Inherit omits it, which an admin's write stores as unset. */
export function fromPersonalAccountChoice(choice: PersonalAccountChoice): {
	personalAccount?: "on" | "off";
} {
	return choice === "inherit" ? {} : { personalAccount: choice };
}

/** The user-update value: "" hands the user back to their groups and the setting. */
export function userPersonalAccountInput(
	choice: PersonalAccountChoice,
): "on" | "off" | "" {
	return choice === "inherit" ? "" : choice;
}

/** Only a system-owned group may carry personalAccount; relay refuses it on any other. */
export function groupTakesPersonalAccount(
	owner: components["schemas"]["Owner"] | undefined,
): boolean {
	return owner?.kind === "system";
}

/** A group's own value, as its detail page reads it. */
export function groupPersonalAccountLabel(value: PersonalAccountValue): string {
	return value ? CHOICE_LABELS[value] : "Inherit (deployment setting)";
}

/**
 * "Off, set for this user" / "On, from the deployment setting" / "Off, from group";
 * for a group source the caller appends the group's name.
 */
export function personalAccountEffectiveText(
	effective: PersonalAccountEffective,
): string {
	const state = effective.state === "on" ? "On" : "Off";
	switch (effective.source) {
		case "user":
			return `${state}, set for this user`;
		case "group":
			return `${state}, from group`;
		default:
			return `${state}, from the deployment setting`;
	}
}

/** The switcher's note while the caller's personal account is off; undefined while it serves. */
export function personalAccountOffNote(
	effective: PersonalAccountEffective | undefined,
	groupName: string | undefined,
): string | undefined {
	if (effective?.state !== "off") return undefined;
	const base = "Personal account is off";
	switch (effective.source) {
		case "user":
			return `${base} (set for you)`;
		case "group":
			return groupName ? `${base} (group ${groupName})` : base;
		default:
			return `${base} (deployment setting)`;
	}
}

export const PERSONAL_ACCOUNT_OFF = "personal_account_off";
export const LANE_REQUIRED = "lane_required";

function hasCode(err: unknown, status: number, code: string): boolean {
	return (
		err instanceof ApiError && err.status === status && err.body.code === code
	);
}

export function isPersonalAccountOff(err: unknown): boolean {
	return hasCode(err, 403, PERSONAL_ACCOUNT_OFF);
}

export const SHARE_RECEIVER_OFF_MESSAGE =
	"Personal accounts are off for this user; share with their team or project instead.";

export const ACCOUNT_OWNER_OFF_MESSAGE =
	"Personal accounts are off for you; switch to a team or project to create this account.";

const KEY_LANE_OFF_MESSAGE =
	"Personal accounts are off for this user; pick a team, project or provider account.";

const KEY_LANE_REQUIRED_MESSAGE =
	"Personal accounts are off for this user; pick the account this key runs in.";

/** The key form's account-field error for a refused lane; undefined for any other failure. */
export function keyLaneError(err: unknown): string | undefined {
	if (hasCode(err, 400, LANE_REQUIRED)) return KEY_LANE_REQUIRED_MESSAGE;
	if (isPersonalAccountOff(err)) return KEY_LANE_OFF_MESSAGE;
	return undefined;
}

/** The provider-account form's owner error when the creator's personal accounts are off. */
export function accountOwnerError(err: unknown): string | undefined {
	return isPersonalAccountOff(err) ? ACCOUNT_OWNER_OFF_MESSAGE : undefined;
}
