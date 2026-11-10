import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/api/auth";
import { myContextsQueryOptions } from "@/api/hooks/contexts";
import type { components } from "@/api/types.gen";
import {
	contextKey,
	contextName,
	contextOwner,
	contextUsableBy,
	type FormPlacement,
	ownerName,
	ownerUsableBy,
	resolveWorkContext,
	SYSTEM_CONTEXT,
	type WorkContext,
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
		contextsLoaded: data !== undefined,
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
export function useFormOwner(fixed?: { owner?: Owner }): {
	owner: Owner | undefined;
	usableBy: string | undefined;
	placement: FormPlacement | undefined;
	/** The context the form creates in; undefined for a fixed owner. */
	context: WorkContext | undefined;
} {
	const { userId } = useAuth();
	const work = useWorkContext();
	// The form's own pick; the workspace (the default) only changes from the switcher.
	const [picked, setPicked] = useState<WorkContextRef | null>(null);
	if (fixed) {
		return {
			owner: fixed.owner,
			usableBy: ownerUsableBy(fixed.owner, userId),
			placement: {
				scope: ownerName(fixed.owner, work.contexts, userId),
				editable: false,
			},
			context: undefined,
		};
	}
	// A pick the caller lost (a revoked role) falls back to the workspace.
	const current =
		(picked &&
			work.contexts.find((c) => contextKey(c) === contextKey(picked))) ||
		work.current;
	if (!current) {
		return {
			owner: work.owner,
			usableBy: work.usableBy,
			placement: undefined,
			context: undefined,
		};
	}
	return {
		owner: contextOwner(current),
		usableBy: contextUsableBy(current),
		placement: {
			scope: contextName(current),
			editable: true,
			contextKey: contextKey(current),
			choose: (key) => {
				const next = work.contexts.find((c) => contextKey(c) === key);
				if (next) setPicked(next);
			},
		},
		context: current,
	};
}
