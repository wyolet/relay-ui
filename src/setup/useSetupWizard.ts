import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCatalogGraph } from "@/api/hooks/catalog";
import { useCreateHostKey } from "@/api/hooks/hostkeys";
import { useHosts, useUpdateHost } from "@/api/hooks/hosts";
import {
	useCreatePolicy,
	usePolicies,
	useUpdatePolicy,
} from "@/api/hooks/policies";
import { useCreateRateLimit } from "@/api/hooks/ratelimits";
import { useCreateRelayKey } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { Host } from "@/api/types/host";
import type { Policy, PolicyCreate } from "@/api/types/policy";
import { displayLabel } from "@/lib/displayLabel";
import { slugWithSuffix } from "@/lib/slug";
import type {
	RateLimitMeter as CanonicalMeter,
	RateLimitStrategy,
} from "@/rate-limits/useRateLimitForm";
import { toast } from "@/shared/Toast";
import { useSetupStore } from "@/stores/setup";
import {
	PROVIDERS,
	type ProviderDef,
	type ProviderId,
	providerById,
} from "./providerCatalog";

export type SetupStep = "provider" | "credentials" | "limits" | "done";

export type RateLimitPer = "minute" | "hour" | "day";

// The meters surfaced in the easy form are a deliberate subset of the canonical
// rate-limit meter enum. Deriving via Extract keeps us in sync and fails the
// build if either literal ever leaves the source enum.
export type RateLimitMeter = Extract<CanonicalMeter, "requests" | "tokens">;

export interface EasyRateLimitRule {
	amount: number;
	per: RateLimitPer;
}

/**
 * Independent, optionally-combined limits — a user can cap requests, tokens, or
 * both. Each present key becomes one RateLimitRule on a single rate limit.
 */
export type EasyRateLimit = Partial<Record<RateLimitMeter, EasyRateLimitRule>>;

export interface ProviderCard {
	def: ProviderDef;
	host: Host | undefined;
	modelCount: number;
	available: boolean;
}

export interface CreatedRelayKey {
	plaintext: string;
	displayName: string;
}

const PER_SECONDS: Record<RateLimitPer, number> = {
	minute: 60,
	hour: 3600,
	day: 86400,
};

function errMessage(err: unknown, fallback: string): string {
	return err instanceof ApiError ? err.body.message : fallback;
}

export function useSetupWizard() {
	const navigate = useNavigate();
	const setDismissed = useSetupStore((s) => s.setDismissed);

	const { data: hostsData } = useHosts();
	const { data: policiesData } = usePolicies();
	const { data: graph } = useCatalogGraph();

	const [step, setStep] = useState<SetupStep>("provider");
	const [providerId, setProviderId] = useState<ProviderId | null>(null);
	const [hostKeyId, setHostKeyId] = useState<string>("");
	// Carried across "add another provider" so later host keys join the same
	// policy and reuse the already-issued relay key.
	const [policy, setPolicy] = useState<Policy | null>(null);
	const [relayKey, setRelayKey] = useState<CreatedRelayKey | null>(null);
	const [sampleModel, setSampleModel] = useState<string>("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// --- catalog plumbing -------------------------------------------------

	const hostForProvider = useMemo(() => {
		const hosts = hostsData.items ?? [];
		return (def: ProviderDef): Host | undefined =>
			hosts.find((h) => def.match(h.metadata.name.toLowerCase()));
	}, [hostsData.items]);

	const modelsForHost = useMemo(() => {
		const models = graph.models ?? [];
		return (hostId: string | undefined) =>
			hostId
				? models.filter((m) =>
						(m.bindings ?? []).some((b) => b.hostId === hostId),
					)
				: [];
	}, [graph.models]);

	const providers = useMemo<ProviderCard[]>(
		() =>
			PROVIDERS.map((def) => {
				const host = hostForProvider(def);
				const models = host ? modelsForHost(host.metadata.id) : [];
				return {
					def,
					host,
					modelCount: models.length,
					available: host !== undefined,
				};
			}),
		[hostForProvider, modelsForHost],
	);

	const selectedProvider = providerId ? providerById(providerId) : null;
	const selectedHost = selectedProvider
		? hostForProvider(selectedProvider)
		: undefined;
	const selectedModelCount = selectedHost
		? modelsForHost(selectedHost.metadata.id).length
		: 0;

	// The host key must attach to a provider/host-owned policy (never a user
	// policy). The host advertises its default via `spec.defaultPolicy` (a slug);
	// resolve it to an id, falling back to the first non-user policy for the host.
	function resolveProviderPolicyId(host: Host): string | undefined {
		const items = policiesData.items ?? [];
		const byDefault = host.spec.defaultPolicy
			? items.find((p) => p.metadata.name === host.spec.defaultPolicy)
			: undefined;
		if (byDefault?.metadata.id) return byDefault.metadata.id;
		const owned = items.find((p) => {
			const owner = p.metadata.owner;
			if (!owner || owner.kind === "user") return false;
			if (owner.kind === "host") return owner.id === host.metadata.id;
			return true;
		});
		return owned?.metadata.id;
	}

	// --- mutations --------------------------------------------------------

	const createHostKey = useCreateHostKey();
	const updateHost = useUpdateHost(selectedHost?.metadata.id ?? "");
	const createPolicy = useCreatePolicy();
	const updatePolicy = useUpdatePolicy();
	const createRateLimit = useCreateRateLimit();
	const createRelayKey = useCreateRelayKey();

	// --- step actions -----------------------------------------------------

	function selectProvider(id: ProviderId) {
		setError(null);
		setProviderId(id);
		setStep("credentials");
	}

	function backToProviders() {
		setError(null);
		setStep("provider");
	}

	async function submitCredentials(input: { apiKey: string; baseURL: string }) {
		if (!selectedProvider || !selectedHost) return;
		setBusy(true);
		setError(null);
		try {
			const hostId = selectedHost.metadata.id;
			if (!hostId) throw new Error("Selected host is missing an id.");
			const policyId = resolveProviderPolicyId(selectedHost);
			if (!policyId) {
				throw new Error(
					"No provider policy is seeded for this host yet. Check the relay deployment.",
				);
			}

			// Ollama: persist a reachable base URL before storing the credential.
			const nextBaseURL = input.baseURL.trim();
			if (
				selectedProvider.local &&
				nextBaseURL &&
				nextBaseURL !== selectedHost.spec.baseURL
			) {
				await updateHost.mutateAsync({
					...selectedHost,
					spec: { ...selectedHost.spec, baseURL: nextBaseURL },
				});
			}

			const label = `${selectedProvider.label} key`;
			const hk = await createHostKey.mutateAsync({
				metadata: { name: slugWithSuffix(label), displayName: label },
				spec: {
					hostId,
					policyId,
					enabled: true,
					value: input.apiKey.trim(),
					valueFrom: { kind: "stored" },
				},
			});
			const newHostKeyId = hk.metadata.id ?? "";
			setHostKeyId(newHostKeyId);

			const firstModel = modelsForHost(selectedHost.metadata.id)[0];
			setSampleModel(firstModel?.name ?? "");

			// "Add another provider" path: a policy + relay key already exist, so
			// just widen the policy to include this host key and jump to the key.
			if (policy) {
				const updated: Policy = {
					...policy,
					spec: {
						...policy.spec,
						hostKeyIds: [...(policy.spec.hostKeyIds ?? []), newHostKeyId],
					},
				};
				const saved = await updatePolicy.mutateAsync({
					id: policy.metadata.id ?? "",
					body: updated,
				});
				setPolicy(saved);
				toast("success", `${selectedProvider.label} connected.`);
				setStep("done");
				return;
			}

			setStep("limits");
		} catch (err) {
			const msg = errMessage(err, "Failed to store the credential.");
			setError(msg);
			toast("error", msg);
		} finally {
			setBusy(false);
		}
	}

	async function finish(limit: EasyRateLimit | null) {
		if (!selectedProvider || !hostKeyId) return;
		setBusy(true);
		setError(null);
		try {
			let rateLimitId: string | undefined;
			const strategy: RateLimitStrategy = "sliding-window";
			const meters: RateLimitMeter[] = ["requests", "tokens"];
			const rules = meters.flatMap((meter) => {
				const rule = limit?.[meter];
				return rule
					? [
							{
								amount: rule.amount,
								meter,
								strategy,
								// `window` is whole seconds on the wire (see timeWindow.ts).
								window: PER_SECONDS[rule.per],
							},
						]
					: [];
			});
			if (rules.length > 0) {
				const rlLabel = `${selectedProvider.label} limit`;
				const rl = await createRateLimit.mutateAsync({
					metadata: { name: slugWithSuffix(rlLabel), displayName: rlLabel },
					spec: { enabled: true, rules },
				});
				rateLimitId = rl.metadata.id;
			}

			const polLabel = `${selectedProvider.label} default`;
			const body: PolicyCreate = {
				metadata: { name: slugWithSuffix(polLabel), displayName: polLabel },
				spec: {
					enabled: true,
					hostKeyIds: [hostKeyId],
					// Legacy single rateLimitId = "applies to the whole policy / all
					// models". We deliberately avoid rlBindings here: each binding
					// requires a non-empty Models list, which we don't have (and don't
					// want — the wizard's limit is policy-wide).
					...(rateLimitId ? { rateLimitId } : {}),
				},
			};
			const createdPolicy = await createPolicy.mutateAsync(body);
			setPolicy(createdPolicy);

			const rk = await createRelayKey.mutateAsync({
				metadata: {
					name: slugWithSuffix("first relay key"),
					displayName: "First relay key",
				},
				spec: { policyId: createdPolicy.metadata.id, enabled: true },
			});
			setRelayKey({ plaintext: rk.plaintext, displayName: "First relay key" });
			toast("success", "Relay key created — you're ready to go.");
			setStep("done");
		} catch (err) {
			const msg = errMessage(err, "Failed to finish setup.");
			setError(msg);
			toast("error", msg);
		} finally {
			setBusy(false);
		}
	}

	function addAnotherProvider() {
		setProviderId(null);
		setHostKeyId("");
		setError(null);
		setStep("provider");
	}

	function leave() {
		setDismissed(true);
		void navigate({ to: "/" });
	}

	return {
		step,
		busy,
		error,
		providers,
		selectedProvider,
		selectedHost,
		selectedModelCount,
		sampleModel,
		relayKey,
		// derived: have we already issued a key (reuse mode)?
		hasIssuedKey: relayKey !== null,
		policyName: policy ? displayLabel(policy.metadata) : "",
		selectProvider,
		backToProviders,
		submitCredentials,
		finish,
		addAnotherProvider,
		leave,
	};
}
