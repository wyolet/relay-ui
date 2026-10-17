import { useAuth } from "@/api/auth";
import { feature } from "@/api/runtimeConfig";

/** Checking another user or service account takes an admin. */
export function useCanCheckOthersAccess(): boolean {
	const { isAdmin } = useAuth();
	return isAdmin && feature("accessReview");
}
