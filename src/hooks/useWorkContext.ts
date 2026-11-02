import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/api/auth";
import { myContextsQueryOptions } from "@/api/hooks/contexts";
import type { components } from "@/api/types.gen";
import {
	contextOwner,
	contextPlacement,
	contextUsableBy,
	ownerPlacement,
	ownerUsableBy,
	resolveWorkContext,
	SYSTEM_CONTEXT,
	type WorkContextRef,
	workContexts,
} from "@/lib/workContext";
import { useWorkContextStore } from "@/stores/workContext";

type Owner = components["schemas"]["Owner"];

/** The caller's contexts, the current one, and what a create in it sends. */
export function useWorkContext() {
	const { isAdmin, userId } = useAuth();
	const selected = useWorkContextStore((s) => s.selected);
	const select = useWorkContextStore((s) => s.select);
	const { data } = useQuery(myContextsQueryOptions);
	const contexts = workContexts(data ?? [], isAdmin);
	const current = data ? resolveWorkContext(contexts, selected) : undefined;
	// Until the list loads, the stored pick (or personal) stands in.
	const ref: WorkContextRef =
		current ??
		selected ??
		(userId ? { kind: "personal", id: userId } : SYSTEM_CONTEXT);

	return {
		contexts,
		current,
		select,
		owner: contextOwner(ref),
		usableBy: contextUsableBy(ref),
	};
}

/**
 * Where a form's row sits and what its pickers may offer: the edited row's
 * metadata (or a page's preset owner), else the current context.
 */
export function useFormOwner(fixed?: { owner?: Owner }) {
	const { userId } = useAuth();
	const work = useWorkContext();
	if (fixed) {
		return {
			owner: fixed.owner,
			usableBy: ownerUsableBy(fixed.owner, userId),
			placement: ownerPlacement(fixed.owner, work.contexts, userId),
		};
	}
	return {
		owner: work.owner,
		usableBy: work.usableBy,
		placement: work.current ? contextPlacement(work.current) : undefined,
	};
}
