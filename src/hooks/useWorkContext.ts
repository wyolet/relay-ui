import { type QueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth, whoamiQueryOptions } from "@/api/auth";
import { myContextsQueryOptions } from "@/api/hooks/contexts";
import type { components } from "@/api/types.gen";
import {
	contextKey,
	contextName,
	contextOwner,
	contextUsableBy,
	contextUsageScope,
	createContext,
	type FormPlacement,
	ORGANIZATION_CONTEXT,
	ownerName,
	ownerUsableBy,
	resolveWorkContext,
	type WorkContext,
	type WorkContextRef,
	workContexts,
} from "@/lib/workContext";
import { useWorkContextStore } from "@/stores/workContext";

type Owner = components["schemas"]["Owner"];
type MyContext = components["schemas"]["MyContext"];

function isWorkspaceKind(
	kind: string | undefined,
): kind is WorkContextRef["kind"] {
	return (
		kind === "personal" ||
		kind === "team" ||
		kind === "project" ||
		kind === "organization"
	);
}

function resolveWorkspace(
	mine: readonly MyContext[] | undefined,
	isAdmin: boolean,
	userId: string | undefined,
	selected: WorkContextRef | null,
) {
	const contexts = workContexts(mine ?? []);
	// A pick saved before the organization owner existed named relay's system layer.
	const stored = isWorkspaceKind(selected?.kind) ? selected : null;
	const current = mine ? resolveWorkContext(contexts, stored) : undefined;
	// Until the list loads, the stored pick or the default stands in, so the
	// first queries already carry the scope the list will resolve to.
	const ref: WorkContextRef =
		current ??
		stored ??
		(!isAdmin && userId
			? { kind: "personal", id: userId }
			: ORGANIZATION_CONTEXT);
	return { contexts, current, ref };
}

/** The caller's contexts, the current one, what a create in it sends, and the usage it shows. */
export function useWorkContext() {
	const { isAdmin, userId } = useAuth();
	const selected = useWorkContextStore((s) => s.selected);
	const select = useWorkContextStore((s) => s.select);
	const { data } = useQuery(myContextsQueryOptions);
	const { contexts, current, ref } = resolveWorkspace(
		data,
		isAdmin,
		userId,
		selected,
	);

	return {
		contexts,
		contextsLoaded: data !== undefined,
		current,
		ref,
		select,
		usageScope: contextUsageScope(ref),
	};
}

/** The workspace's usage scope from cached data, for loaders. */
export function cachedUsageScope(queryClient: QueryClient) {
	const who = queryClient.getQueryData(whoamiQueryOptions.queryKey);
	const { ref } = resolveWorkspace(
		queryClient.getQueryData(myContextsQueryOptions.queryKey),
		who?.roles.includes("admin") ?? false,
		who?.userId,
		useWorkContextStore.getState().selected,
	);
	return contextUsageScope(ref);
}

/**
 * Where a form's row sits and what its pickers may offer: the edited row's
 * metadata (or a page's preset owner), else the current context. A kind the
 * organization can't own (`organizationOwns` false) creates elsewhere from it.
 */
export function useFormOwner(
	fixed?: { owner?: Owner },
	organizationOwns = true,
): {
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
	// A pick the caller lost (a revoked role) falls back to where the workspace creates.
	const current =
		(picked &&
			work.contexts.find((c) => contextKey(c) === contextKey(picked))) ||
		(work.current &&
			createContext(work.current, work.contexts, organizationOwns));
	if (!current) {
		// Contexts still loading: the workspace the list will resolve to.
		const ref =
			work.ref.kind === "organization" && !organizationOwns && userId
				? { kind: "personal" as const, id: userId }
				: work.ref;
		return {
			owner: contextOwner(ref),
			usableBy: contextUsableBy(ref),
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
			organization: organizationOwns,
		},
		context: current,
	};
}
