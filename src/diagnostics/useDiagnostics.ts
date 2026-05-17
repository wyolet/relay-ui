import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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

export function useDiagnosticGraph(): DiagnosticGraph {
	const { data: policies } = useSuspenseQuery(policiesListQueryOptions);
	const { data: hostKeys } = useSuspenseQuery(hostKeysListQueryOptions);
	const { data: hosts } = useSuspenseQuery(hostsListQueryOptions);
	const { data: models } = useSuspenseQuery(modelsListQueryOptions);
	const { data: rateLimits } = useSuspenseQuery(rateLimitsListQueryOptions);
	const { data: relayKeys } = useSuspenseQuery(relayKeysListQueryOptions);
	const { data: providers } = useSuspenseQuery(providersListQueryOptions);

	return useMemo(
		() =>
			buildDiagnosticGraph({
				policies: policies.items ?? [],
				hostKeys: hostKeys.items ?? [],
				hosts: hosts.items ?? [],
				models: models.items ?? [],
				rateLimits: rateLimits.items ?? [],
				relayKeys: relayKeys.items ?? [],
				providers: providers.items ?? [],
			}),
		[
			policies.items,
			hostKeys.items,
			hosts.items,
			models.items,
			rateLimits.items,
			relayKeys.items,
			providers.items,
		],
	);
}

export function usePolicyDiagnostics(
	policyId: string | undefined,
): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!policyId) return [];
		const policy = graph.policies.get(policyId);
		if (!policy) return [];
		return analyzePolicy(policy, graph);
	}, [graph, policyId]);
}

export function useRelayKeyDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!id) return [];
		const rk = graph.relayKeys.get(id);
		if (!rk) return [];
		return analyzeRelayKey(rk, graph);
	}, [graph, id]);
}

export function useHostKeyDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!id) return [];
		const hk = graph.hostKeys.get(id);
		if (!hk) return [];
		return analyzeHostKey(hk, graph);
	}, [graph, id]);
}

export function useRateLimitDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!id) return [];
		const rl = graph.rateLimits.get(id);
		if (!rl) return [];
		return analyzeRateLimit(rl, graph);
	}, [graph, id]);
}

export function useModelDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!id) return [];
		const m = graph.models.get(id);
		if (!m) return [];
		return analyzeModel(m, graph);
	}, [graph, id]);
}

export function useHostDiagnostics(id: string | undefined): Diagnostic[] {
	const graph = useDiagnosticGraph();
	return useMemo(() => {
		if (!id) return [];
		const h = graph.hosts.get(id);
		if (!h) return [];
		return analyzeHost(h, graph);
	}, [graph, id]);
}
