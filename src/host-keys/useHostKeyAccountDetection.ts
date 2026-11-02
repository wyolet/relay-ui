import { useAccounts } from "@/api/hooks/accounts";
import { useDetectHostKeyAccount } from "@/api/hooks/hostkeys";
import {
	type DetectionVerdict,
	detectionErrorMessage,
	detectionVerdict,
} from "./hostKeyAccount";

export interface DetectedOrganization {
	orgId: string;
	orgName: string | undefined;
	verdict: DetectionVerdict;
}

/** Asks the host which organization the key belongs to; never moves the key. */
export function useHostKeyAccountDetection(hostKeyId: string) {
	const detect = useDetectHostKeyAccount();
	const { data: accountsData } = useAccounts();
	const result = detect.data;

	const detected: DetectedOrganization | undefined = result
		? {
				orgId: result.orgId,
				orgName: result.orgName?.trim() || undefined,
				verdict: detectionVerdict(result, accountsData.items ?? []),
			}
		: undefined;

	return {
		detect: () => detect.mutate(hostKeyId),
		isPending: detect.isPending,
		detected,
		errorMessage: detect.error
			? detectionErrorMessage(detect.error)
			: undefined,
	};
}
