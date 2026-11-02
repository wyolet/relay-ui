import type { AccountSpec } from "@/api/hooks/accounts";

type PayloadLogging = NonNullable<AccountSpec["payloadLogging"]>;

/** The form value; "inherit" sends the field omitted. */
export type PayloadLoggingChoice = PayloadLogging | "inherit";

export const PAYLOAD_LOGGING_LABELS: Record<PayloadLoggingChoice, string> = {
	inherit: "Inherit",
	on: "On",
	off: "Off",
};

export const PAYLOAD_LOGGING_CHOICES = [
	"inherit",
	"on",
	"off",
] as const satisfies readonly PayloadLoggingChoice[];

export function toPayloadLoggingChoice(
	value: AccountSpec["payloadLogging"],
): PayloadLoggingChoice {
	return value ?? "inherit";
}

export function fromPayloadLoggingChoice(
	choice: PayloadLoggingChoice,
): PayloadLogging | undefined {
	return choice === "inherit" ? undefined : choice;
}
