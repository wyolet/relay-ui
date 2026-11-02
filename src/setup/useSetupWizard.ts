import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/api/auth";
import { accountListQuery } from "@/api/hooks/accounts";
import { useCatalogGraph } from "@/api/hooks/catalog";
import { useCreateHostKey } from "@/api/hooks/hostkeys";
import { useHosts, useUpdateHost } from "@/api/hooks/hosts";
import { useCreateKey } from "@/api/hooks/keys";
import { useCreatePolicy, useUpdatePolicy } from "@/api/hooks/policies";
import {
	policyBindingsListQuery,
	useCreatePolicyBinding,
} from "@/api/hooks/policyBindings";
import { useCreatePool } from "@/api/hooks/pools";
import { useCreateRateLimit } from "@/api/hooks/ratelimits";
import { ApiError } from "@/api/types/errors";
import type { Host } from "@/api/types/host";
import type { Policy, PolicySpec } from "@/api/types/policy";
import { displayLabel } from "@/lib/displayLabel";
import { slugWithSuffix } from "@/lib/slug";
import type {
	RateLimitMeter as CanonicalMeter,
	RateLimitStrategy,
} from "@/rate-limits/useRateLimitForm";
import { toast } from "@/shared/Toast";
import { useSetupStore } from "@/stores/setup";
import { personalAccountOf } from "./personalAccount";
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

export interface CreatedKey {
	plaintext: string;
	displayName: string;
}

/** A model the freshly-connected host serves, shaped for the snippet picker. */
export interface SampleModel {
	/** Stable model name (alias/pointer); used as the picker's key. */
	name: string;
	/** Human label shown in the picker. */
	displayName: string;
	/** Value sent in the request body — the model `pointer`, else `name`. */
	value: string;
}

const PER_SECONDS: Record<RateLimitPer, number> = {
	minute: 60,
	hour: 3600,
	day: 86400,
};

/** How many of a host's models to surface in the snippet picker. */
const MAX_SAMPLE_MODELS = 6;

/** A host key connected in this session that no pool holds yet. */
interface UnpooledKey {
	hostId: string;
	hostKeyId: string;
	label: string;
}

function errMessage(err: unknown, fallback: string): string {
	if (err instanceof ApiError) return err.body.message || fallback;
	if (err instanceof Error && err.message) return err.message;
	return fallback;
}

export function useSetupWizard() {
	const navigate = useNavigate();
	const setDismissed = useSetupStore((s) => s.setDismissed);

	const { data: hostsData } = useHosts();
	const { data: graph } = useCatalogGraph();
	// Separate, server-filtered graph of just the curated models for the snippet
	// picker. Kept apart from the full graph (used for provider cards / counts).
	const { data: featuredGraph } = useCatalogGraph({ label: ["featured=true"] });

	const [step, setStep] = useState<SetupStep>("provider");
	const [providerId, setProviderId] = useState<ProviderId | null>(null);
	// The caller's own keys reach the host keys they create without a policy.
	// One is created, and bound to the caller's personal account, only for a
	// rate limit or a keyless host; it's carried across "add another provider".
	const [policy, setPolicy] = useState<Policy | null>(null);
	const [unpooledKeys, setUnpooledKeys] = useState<UnpooledKey[]>([]);
	const [apiKey, setApiKey] = useState<CreatedKey | null>(null);
	const [sampleModels, setSampleModels] = useState<SampleModel[]>([]);
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

	// A curated handful of the host's models for the snippet picker: human label
	// from `displayName`, request value from the model `pointer` (the pinned id
	// clients should send), falling back to `name`. Drawn from the server-side
	// `featured` graph; falls back to the full graph (first N) when a host flags
	// no featured models.
	const sampleModelsForHost = useMemo(() => {
		const featuredModels = featuredGraph.models ?? [];
		return (hostId: string | undefined): SampleModel[] => {
			if (!hostId) return [];
			const featured = featuredModels.filter((m) =>
				(m.bindings ?? []).some((b) => b.hostId === hostId),
			);
			const source = featured.length > 0 ? featured : modelsForHost(hostId);
			return source.slice(0, MAX_SAMPLE_MODELS).map((m) => ({
				name: m.name,
				displayName: m.displayName ?? m.name,
				value: m.pointer ?? m.name,
			}));
		};
	}, [featuredGraph.models, modelsForHost]);

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

	// --- mutations --------------------------------------------------------

	const createHostKey = useCreateHostKey();
	const updateHost = useUpdateHost();
	const createPolicy = useCreatePolicy();
	const updatePolicy = useUpdatePolicy();
	const createBinding = useCreatePolicyBinding();
	const createPool = useCreatePool();
	const createRateLimit = useCreateRateLimit();
	const createKey = useCreateKey();
	const { userId } = useAuth();
	const queryClient = useQueryClient();

	async function createPoolFor(
		label: string,
		hostId: string,
		credentialIds: string[],
	): Promise<string> {
		const poolLabel = `${label} pool`;
		const pool = await createPool.mutateAsync({
			metadata: { name: slugWithSuffix(poolLabel), displayName: poolLabel },
			spec: { hostId, credentialIds },
		});
		return pool.metadata.id ?? "";
	}

	/**
	 * The caller's personal account, the lane their first key defaults to.
	 * Checked before anything is created: an account takes one binding, so an
	 * already-bound one stops the wizard with the binding to edit instead.
	 */
	async function personalAccountToBind(): Promise<string> {
		if (!userId) throw new Error("Sign in again to finish setup.");
		const accounts = await queryClient.fetchQuery(
			accountListQuery({ kind: ["personal"], holder_id: [userId] }),
		);
		const accountId = personalAccountOf(accounts.items ?? [], userId)?.metadata
			.id;
		if (!accountId) {
			throw new Error(
				"Relay hasn't created your personal account yet. Try again in a moment.",
			);
		}
		const bindings = await queryClient.fetchQuery(
			policyBindingsListQuery({ account_id: [accountId] }),
		);
		const held = bindings.items?.[0];
		if (held) {
			throw new Error(
				`Your personal account is already bound by "${displayLabel(held.metadata)}", and an account takes one binding. Add the pool or rate limit to that binding's policy instead.`,
			);
		}
		return accountId;
	}

	/**
	 * Updates the wizard's policy, or creates it and binds it to
	 * `bindAccountId` (from {@link personalAccountToBind}).
	 */
	async function savePolicy(
		patch: Partial<PolicySpec>,
		bindAccountId: string | undefined,
	): Promise<void> {
		if (policy) {
			const saved = await updatePolicy.mutateAsync({
				id: policy.metadata.id ?? "",
				body: { ...policy, spec: { ...policy.spec, ...patch } },
			});
			setPolicy(saved);
			return;
		}
		if (!bindAccountId) throw new Error("No account to bind the policy to.");
		const label = "Setup policy";
		const created = await createPolicy.mutateAsync({
			metadata: { name: slugWithSuffix(label), displayName: label },
			spec: { enabled: true, ...patch },
		});
		// Owned like its policy: a system policy takes a system binding, a
		// caller-owned one the caller's own binding.
		await createBinding.mutateAsync({
			metadata: {
				name: slugWithSuffix(label),
				displayName: label,
				owner: created.metadata.owner,
			},
			spec: {
				policyId: created.metadata.id ?? "",
				accountIds: [bindAccountId],
			},
		});
		setPolicy(created);
	}

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

			// Unauthenticated local provider (e.g. Ollama with no key): no host
			// key to store. Only create one when a key is given.
			const keyValue = input.apiKey.trim();
			// Without a key the host is reached through a pool, so a policy.
			const bindAccountId =
				!policy && !keyValue ? await personalAccountToBind() : undefined;

			// Ollama: persist a reachable base URL before storing the credential.
			const nextBaseURL = input.baseURL.trim();
			if (
				selectedProvider.local &&
				nextBaseURL &&
				nextBaseURL !== selectedHost.spec.baseURL
			) {
				await updateHost.mutateAsync({
					id: hostId,
					body: {
						...selectedHost,
						spec: { ...selectedHost.spec, baseURL: nextBaseURL },
					},
				});
			}

			const label = selectedProvider.label;
			let newHostKeyId = "";
			if (keyValue) {
				const keyLabel = `${label} key`;
				const hk = await createHostKey.mutateAsync({
					metadata: { name: slugWithSuffix(keyLabel), displayName: keyLabel },
					spec: {
						hostId,
						enabled: true,
						value: keyValue,
						valueFrom: { kind: "stored" },
					},
				});
				newHostKeyId = hk.metadata.id ?? "";
			}

			// A keyless host is reached only through a pool a caller policy links,
			// and once a policy links pools, ownership no longer reaches the other
			// keys: from then on every key this session connects goes in a pool.
			const linkedPools = policy?.spec.poolIds ?? [];
			if (!newHostKeyId || linkedPools.length > 0) {
				const earlier =
					linkedPools.length > 0
						? []
						: await Promise.all(
								unpooledKeys.map((k) =>
									createPoolFor(k.label, k.hostId, [k.hostKeyId]),
								),
							);
				const added = await createPoolFor(
					label,
					hostId,
					newHostKeyId ? [newHostKeyId] : [],
				);
				await savePolicy(
					{ poolIds: [...linkedPools, ...earlier, added] },
					bindAccountId,
				);
				setUnpooledKeys([]);
			} else {
				setUnpooledKeys((prev) => [
					...prev,
					{ hostId, hostKeyId: newHostKeyId, label },
				]);
			}

			setSampleModels(sampleModelsForHost(selectedHost.metadata.id));

			// "Add another provider" path: the key is already issued.
			if (apiKey !== null) {
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
		if (!selectedProvider || !selectedHost) return;
		setBusy(true);
		setError(null);
		try {
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
				const bindAccountId = policy
					? undefined
					: await personalAccountToBind();
				const rlLabel = `${selectedProvider.label} limit`;
				const rl = await createRateLimit.mutateAsync({
					metadata: { name: slugWithSuffix(rlLabel), displayName: rlLabel },
					spec: { enabled: true, rules },
				});
				await savePolicy(
					{
						rateLimits: [
							...(policy?.spec.rateLimits ?? []),
							{ rateLimitId: rl.metadata.id ?? "" },
						],
					},
					bindAccountId,
				);
			}

			const rk = await createKey.mutateAsync({
				metadata: {
					name: slugWithSuffix("first key"),
					displayName: "First key",
				},
				spec: {
					// The wizard runs as the signed-in operator, so the first key is
					// theirs — no service account exists yet.
					principal: { kind: "user", id: userId ?? "" },
					enabled: true,
				},
			});
			setApiKey({ plaintext: rk.plaintext, displayName: "First key" });
			toast("success", "Key created — you're ready to go.");
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
		sampleModels,
		apiKey,
		// derived: have we already issued a key (reuse mode)?
		hasIssuedKey: apiKey !== null,
		selectProvider,
		backToProviders,
		submitCredentials,
		finish,
		addAnotherProvider,
		leave,
	};
}
