import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { accountListQueryOptions } from "@/api/hooks/accounts";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { keysListQueryOptions } from "@/api/hooks/keys";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { useObjectPlanIssues } from "@/api/hooks/planIssues";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { poolListQueryOptions } from "@/api/hooks/pools";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { analyzeHost } from "@/diagnostics/analyzers/host";
import { analyzeHostKey } from "@/diagnostics/analyzers/hostKey";
import { analyzeKey } from "@/diagnostics/analyzers/key";
import { analyzeModel } from "@/diagnostics/analyzers/model";
import { analyzePolicy } from "@/diagnostics/analyzers/policy";
import { analyzeRateLimit } from "@/diagnostics/analyzers/rateLimit";
import { buildDiagnosticGraph } from "@/diagnostics/buildGraph";
import { planIssueDiagnostic } from "@/diagnostics/planIssues";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";

/**
 * Builds the cross-resource diagnostic graph from the domain lists,
 * non-blocking. Each list is a plain `useQuery`, so an unresolved (or failed)
 * fetch yields `undefined` rather than suspending or throwing — diagnostics
 * simply stream in once every list has loaded.
 *
 * Behavior change vs. the old suspense version: a failing list fetch now
 * leaves diagnostics empty instead of throwing to the route error boundary.
 */
export function useDiagnosticGraph(): DiagnosticGraph | undefined {
	const { data: policies } = useQuery(policiesListQueryOptions);
	const { data: hostKeys } = useQuery(hostKeysListQueryOptions);
	const { data: hosts } = useQuery(hostsListQueryOptions);
	const { data: models } = useQuery(modelsListQueryOptions);
	const { data: rateLimits } = useQuery(rateLimitsListQueryOptions);
	const { data: pools } = useQuery(poolListQueryOptions);
	const { data: keys } = useQuery(keysListQueryOptions);
	const { data: providers } = useQuery(providersListQueryOptions);
	const { data: bindings } = useQuery(bindingsListQueryOptions);
	// Not waited on: without accounts, pool accounts count as serving.
	const { data: accounts } = useQuery({
		...accountListQueryOptions,
		retry: false,
	});

	return useMemo(() => {
		if (
			!policies ||
			!hostKeys ||
			!hosts ||
			!models ||
			!rateLimits ||
			!pools ||
			!keys ||
			!providers ||
			!bindings
		) {
			return undefined;
		}
		return buildDiagnosticGraph({
			accounts: accounts?.items ?? [],
			policies: policies.items ?? [],
			hostKeys: hostKeys.items ?? [],
			hosts: hosts.items ?? [],
			models: models.items ?? [],
			rateLimits: rateLimits.items ?? [],
			pools: pools.items ?? [],
			keys: keys.items ?? [],
			providers: providers.items ?? [],
			bindings: bindings.items ?? [],
		});
	}, [
		accounts,
		policies,
		hostKeys,
		hosts,
		models,
		rateLimits,
		pools,
		keys,
		providers,
		bindings,
	]);
}

export function usePolicyDiagnostics(
	policyId: string | undefined,
): Diagnostic[] {
	const graph = useDiagnosticGraph();
	const local = useMemo(() => {
		if (!graph || !policyId) return [];
		const policy = graph.policies.get(policyId);
		if (!policy) return [];
		return analyzePolicy(policy, graph);
	}, [graph, policyId]);
	return useWithPlanIssues("policy", policyId, local);
}

export function useKeyDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	const local = useMemo(() => {
		if (!graph || !id) return [];
		const rk = graph.keys.get(id);
		if (!rk) return [];
		return analyzeKey(rk, graph);
	}, [graph, id]);
	return useWithPlanIssues("key", id, local);
}

export function useHostKeyDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	const local = useMemo(() => {
		if (!graph || !id) return [];
		const hk = graph.hostKeys.get(id);
		if (!hk) return [];
		return analyzeHostKey(hk, graph);
	}, [graph, id]);
	return useWithPlanIssues("credential", id, local);
}

export function useRateLimitDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	const local = useMemo(() => {
		if (!graph || !id) return [];
		const rl = graph.rateLimits.get(id);
		if (!rl) return [];
		return analyzeRateLimit(rl, graph);
	}, [graph, id]);
	return useWithPlanIssues("ratelimit", id, local);
}

export function useModelDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	const local = useMemo(() => {
		if (!graph || !id) return [];
		const m = graph.models.get(id);
		if (!m) return [];
		return analyzeModel(m, graph);
	}, [graph, id]);
	return useWithPlanIssues("model", id, local);
}

export function useHostDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	const local = useMemo(() => {
		if (!graph || !id) return [];
		const h = graph.hosts.get(id);
		if (!h) return [];
		return analyzeHost(h, graph);
	}, [graph, id]);
	return useWithPlanIssues("host", id, local);
}

/** The UI's own checks for one object followed by relay's plan issues for it. */
function useWithPlanIssues(
	kind: string,
	id: string | undefined,
	local: Diagnostic[],
): Diagnostic[] {
	const issues = useObjectPlanIssues(kind, id);
	return useMemo(
		() =>
			issues.length === 0
				? local
				: [...local, ...issues.map(planIssueDiagnostic)],
		[local, issues],
	);
}

/** Relay's plan issues for an object the UI runs no checks of its own on. */
export function usePlanDiagnostics(
	kind: string,
	id: string | undefined,
): Diagnostic[] {
	return useWithPlanIssues(kind, id, NO_DIAGNOSTICS);
}

const NO_DIAGNOSTICS: Diagnostic[] = [];
