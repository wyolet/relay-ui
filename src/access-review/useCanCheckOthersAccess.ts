import { useAuth } from "@/api/auth";
import { useAccessReviewAvailable } from "@/api/hooks/accessReview";

/** Checking another user or service account takes an admin. */
export function useCanCheckOthersAccess(): boolean {
	const { isAdmin } = useAuth();
	const available = useAccessReviewAvailable();
	return isAdmin && available;
}
