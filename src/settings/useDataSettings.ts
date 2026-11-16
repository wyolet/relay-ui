import { useQuery } from "@tanstack/react-query";
import {
	payloadLoggingQueryOptions,
	useUpdatePayloadLogging,
} from "@/api/hooks/settings";
import { fmtBytes } from "@/lib/format";
import { useSettingSave } from "@/settings/useSettingSave";

/** Payload capture's switch and how much of each body it keeps. */
export function useDataSettings() {
	const payload = useQuery({ ...payloadLoggingQueryOptions, retry: false });
	const save = useSettingSave(
		useUpdatePayloadLogging(),
		"Failed to update payload logging.",
	);
	const value = payload.data?.value;
	return {
		captureOn: value?.enabled,
		setCaptureOn: (next: boolean) =>
			value &&
			save.save(
				{ ...value, enabled: next },
				`Payload capture ${next ? "on" : "off"}`,
				"payload-logging",
			),
		pending: save.pending,
		bodyCap: value
			? value.maxBytes
				? `Bodies up to ${fmtBytes(value.maxBytes)}`
				: "Whole bodies"
			: undefined,
	};
}
