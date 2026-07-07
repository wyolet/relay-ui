import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { analyzeHost } from "@/diagnostics/analyzers/host";
import { analyzeHostKey } from "@/diagnostics/analyzers/hostKey";
import { analyzeModel } from "@/diagnostics/analyzers/model";
import { analyzePolicy } from "@/diagnostics/analyzers/policy";
import { analyzeRateLimit } from "@/diagnostics/analyzers/rateLimit";
import { analyzeRelayKey } from "@/diagnostics/analyzers/relayKey";
import { buildDiagnosticGraph } from "@/diagnostics/buildGraph";
import type { Diagnostic, DiagnosticGraph } from "@/diagnostics/types";

/**
 * Builds the cross-resource diagnostic graph from the eight domain lists,
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
	const { data: relayKeys } = useQuery(relayKeysListQueryOptions);
	const { data: providers } = useQuery(providersListQueryOptions);
	const { data: bindings } = useQuery(bindingsListQueryOptions);

	return useMemo(() => {
		if (
			!policies ||
			!hostKeys ||
			!hosts ||
			!models ||
			!rateLimits ||
			!relayKeys ||
			!providers ||
			!bindings
		) {
			return undefined;
		}
		return buildDiagnosticGraph({
			policies: policies.items ?? [],
			hostKeys: hostKeys.items ?? [],
			hosts: hosts.items ?? [],
			models: models.items ?? [],
			rateLimits: rateLimits.items ?? [],
			relayKeys: relayKeys.items ?? [],
			providers: providers.items ?? [],
			bindings: bindings.items ?? [],
		});
	}, [
		policies,
		hostKeys,
		hosts,
		models,
		rateLimits,
		relayKeys,
		providers,
		bindings,
	]);
}

export function usePolicyDiagnostics(
	policyId: string | undefined,
): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!graph || !policyId) return [];
		const policy = graph.policies.get(policyId);
		if (!policy) return [];
		return analyzePolicy(policy, graph);
	}, [graph, policyId]);
}

export function useRelayKeyDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!graph || !id) return [];
		const rk = graph.relayKeys.get(id);
		if (!rk) return [];
		return analyzeRelayKey(rk, graph);
	}, [graph, id]);
}

export function useHostKeyDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!graph || !id) return [];
		const hk = graph.hostKeys.get(id);
		if (!hk) return [];
		return analyzeHostKey(hk, graph);
	}, [graph, id]);
}

export function useRateLimitDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!graph || !id) return [];
		const rl = graph.rateLimits.get(id);
		if (!rl) return [];
		return analyzeRateLimit(rl, graph);
	}, [graph, id]);
}

export function useModelDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!graph || !id) return [];
		const m = graph.models.get(id);
		if (!m) return [];
		return analyzeModel(m, graph);
	}, [graph, id]);
}

export function useHostDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!graph || !id) return [];
		const h = graph.hosts.get(id);
		if (!h) return [];
		return analyzeHost(h, graph);
	}, [graph, id]);
}
